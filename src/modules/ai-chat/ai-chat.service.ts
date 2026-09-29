import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { MealLogsService } from '../meal-logs/meal-logs.service';
import { ChatQueryDto } from './dto/ai-chat.dto';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly nutritionService: NutritionService,
    private readonly mealLogsService: MealLogsService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async getChatHistory(userId: string) {
    return this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }

  async clearChatHistory(userId: string) {
    await this.prisma.chatMessage.deleteMany({
      where: { userId },
    });
    return { message: 'Chat history cleared successfully' };
  }

  async processQuery(userId: string, dto: ChatQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Save user's question
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'user',
        content: dto.message,
      },
    });

    // 2. Fetch user's live nutrition context
    const metrics = this.nutritionService.calculate(user);
    const todaySummary = await this.mealLogsService.getDaySummary(userId);

    // 3. Generate response using Gemini Pro 1.5 or intelligent contextual fallback
    let responseText = '';
    let quickFollowUps: string[] = [];

    if (this.genAI) {
      try {
        const aiResult = await this.generateGeminiResponse(
          user,
          metrics,
          todaySummary,
          dto.message,
        );
        responseText = aiResult.content;
        quickFollowUps = aiResult.quickFollowUps;
      } catch (err) {
        this.logger.warn(`Gemini AI Chat error: ${err.message}. Using fallback engine.`);
        const fallback = this.generateFallbackResponse(user, metrics, todaySummary, dto.message);
        responseText = fallback.content;
        quickFollowUps = fallback.quickFollowUps;
      }
    } else {
      const fallback = this.generateFallbackResponse(user, metrics, todaySummary, dto.message);
      responseText = fallback.content;
      quickFollowUps = fallback.quickFollowUps;
    }

    // 4. Save assistant's response
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: responseText,
        quickFollowUps,
      },
    });

    return {
      userMessage,
      assistantMessage,
    };
  }

  private async generateGeminiResponse(
    user: any,
    metrics: any,
    todaySummary: any,
    userQuery: string,
  ): Promise<{ content: string; quickFollowUps: string[] }> {
    const model = this.genAI.getGenerativeModel({
      model: this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash'),
    });

    // Fetch last 4 conversation turns for context
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    const historyText = recentMessages
      .reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'NutriPath'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are NutriPath AI (নিউট্রিপ্যাথ এআই), an expert, warm, and empathetic clinical nutritionist and lifestyle coach specialized in authentic Bangladeshi and South Asian diets.

USER HEALTH PROFILE:
- Name: ${user.name}
- Gender: ${user.gender}, Age: ${user.age} yrs
- Current Weight: ${user.currentWeight} kg, Target Weight: ${user.targetWeight} kg (Timeline: ${user.targetMonths} months)
- Height: ${user.heightCm} cm
- Daily Calorie Budget: ${metrics.budget} kcal (BMR: ${metrics.bmr} kcal, TDEE: ${metrics.tdee} kcal)
- Target Macros: Protein ${metrics.macros.proteinG}g, Carbs ${metrics.macros.carbsG}g, Fat ${metrics.macros.fatG}g
- Today's Consumed: ${todaySummary.totalKcal} kcal | Remaining: ${todaySummary.remainingKcal} kcal
- Water Logged Today: ${todaySummary.habits.waterGlasses} glasses | Walk: ${todaySummary.habits.walkMinutes} mins (Goal: ${todaySummary.habits.walkMinGoal}m)
- Health Conditions: ${user.healthConditions.join(', ')}

GUIDELINES:
1. Always respond in fluent, empathetic, and culturally accurate Bengali (বাংলা).
2. Reference authentic Bangladeshi foods (ভাত, লাল আটার রুটি, মসুর ডাল, রুই মাছ, ডিম, শাকসবজি, টক দই, পেয়ারা).
3. If they ask about eating rice or carbs, guide them on portion control (যেমন ১ কাপ ভাত) rather than complete starvation.
4. Keep the response encouraging, scientifically accurate, and easy to follow.
5. At the very end of your response, output a JSON block for quick follow-up questions formatted exactly like:
<<<FOLLOW_UPS>>>
["Follow up 1 in Bengali", "Follow up 2 in Bengali"]
<<<END_FOLLOW_UPS>>>`;

    const fullPrompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${historyText}\n\nUser Question: ${userQuery}\n\nNutriPath AI Response:`;

    const result = await model.generateContent(fullPrompt);
    const rawText = result.response.text();

    let content = rawText;
    let quickFollowUps: string[] = [
      'আজকের রাতের খাবারের জন্য ভালো অপশন কী?',
      'ওজন দ্রুত কমাতে কোন খাবার বাদ দেওয়া উচিত?',
      'ব্যায়াম ছাড়া কি ওজন কমানো সম্ভব?',
    ];

    const followUpMatch = rawText.match(/<<<FOLLOW_UPS>>>([\s\S]*?)<<<END_FOLLOW_UPS>>>/);
    if (followUpMatch) {
      content = rawText.replace(/<<<FOLLOW_UPS>>>[\s\S]*?<<<END_FOLLOW_UPS>>>/, '').trim();
      try {
        const parsed = JSON.parse(followUpMatch[1].trim());
        if (Array.isArray(parsed) && parsed.length > 0) {
          quickFollowUps = parsed.slice(0, 3);
        }
      } catch (e) {
        // use default
      }
    }

    return { content, quickFollowUps };
  }

  private generateFallbackResponse(
    user: any,
    metrics: any,
    todaySummary: any,
    query: string,
  ): { content: string; quickFollowUps: string[] } {
    const q = query.toLowerCase();

    let content = '';
    const quickFollowUps = [
      'আজকের রাতের খাবারের জন্য ভালো অপশন কী?',
      'ডাল আর ডিম একসাথে খাওয়া যাবে কি?',
      'পানি কত গ্লাস খাওয়া উচিত?',
    ];

    if (q.includes('ভাত') || q.includes('rice') || q.includes('carbs')) {
      content = `সালাম ${user.name}! ভাত খাওয়া পুরোপুরি বন্ধ করার কোনো প্রয়োজন নেই। আপনার দৈনিক ক্যালোরি বাজেট ${metrics.budget} ক্যালোরি। 

💡 **পরামর্শ:**
• দুপুরে ১ কাপ (১৫০ গ্রাম) সাদা বা লাল চালের ভাত খেতে পারেন (প্রায় ২০০ ক্যালোরি)।
• প্লেটের অর্ধেক অংশ শাকসবজি ও সালাদ দিয়ে ভরিয়ে নিন, আর ১ টুকরো মাছ বা মুরগির মাংস রাখুন।
• রাতে ভাতের বদলে ১-২টি পাতলা লাল আটার রুটি খাওয়া বেশি স্বাস্থ্যকর হতে পারে।

আজকে আপনার এখনও **${todaySummary.remainingKcal} ক্যালোরি** বাকি আছে!`;
    } else if (q.includes('ক্যালোরি') || q.includes('বাজেট') || q.includes('kcal')) {
      content = `আপনার বর্তমান ওজন **${user.currentWeight} কেজি** এবং লক্ষ্যমাত্রা **${user.targetWeight} কেজি**। 

📊 **আপনার দৈনিক ক্যালকুলেশন:**
• বেসাল মেটাবলিক রেট (BMR): ${metrics.bmr} kcal
• দৈনিক শক্তি খরচ (TDEE): ${metrics.tdee} kcal
• দৈনিক ক্যালোরি সিলিং: **${metrics.budget} kcal**
• আজ গ্রহণ করেছেন: **${todaySummary.totalKcal} kcal**
• আজ বাকি আছে: **${todaySummary.remainingKcal} kcal**

টার্গেটে পৌঁছাতে প্রতিদিন অন্তত ${metrics.walkMinGoal} মিনিট হাঁটার চেষ্টা করুন এবং ৮ গ্লাস পানি পান করুন!`;
    } else if (q.includes('পানি') || q.includes('water')) {
      content = `আপনার সুস্থতা ও ফ্যাট লসের জন্য প্রতিদিন কমপক্ষে ৮-১০ গ্লাস (২-২.৫ লিটার) পানি পান করা অত্যন্ত জরুরি।

আজকে আপনি **${todaySummary.habits.waterGlasses} গ্লাস** পানি লগ করেছেন। প্রতিবার খাবারের ৩০ মিনিট আগে ১ গ্লাস পানি খেলে অতিরিক্ত খাবার গ্রহণের প্রবণতা কমে যায়!`;
    } else if (q.includes('রাত') || q.includes('dinner') || q.includes('ডিনার')) {
      content = `রাতের খাবারে হালকা এবং হাই-প্রোটিন, লো-কার্ব খাবার রাখা সবচেয়ে ভালো। 

🥗 **আদর্শ রাতের খাবারের মেনু:**
• ১টি লাল আটার রুটি অথবা ১ বাটি ওটস খিচুড়ি
• ১ বাটি ঘন মসুর ডাল বা সবজি ভাজি
• ১টি সিদ্ধ ডিম বা গ্রিল করা মুরগির মাংস
• শসা ও লেবুর সালাদ

আজ রাতে খাওয়ার জন্য আপনার **${todaySummary.remainingKcal} ক্যালোরি** বরাদ্দ রয়েছে। ঘুমানোর অন্তত ২ ঘণ্টা আগে ডিনার শেষ করার চেষ্টা করুন।`;
    } else {
      content = `ধন্যবাদ ${user.name}! একজন সার্টিফাইড নিউট্রিশনিস্ট হিসেবে আপনার সুস্থতায় পাশে থাকতে পেরে আনন্দিত।

আপনার বর্তমান ওজন **${user.currentWeight} কেজি** থেকে **${user.targetWeight} কেজি** অর্জনের জন্য আপনার দৈনিক ক্যালোরি বাজেট **${metrics.budget} kcal**। 
আজকে আপনার মোট খরচ হয়েছে **${todaySummary.totalKcal} kcal**, এবং বাকি আছে **${todaySummary.remainingKcal} kcal**।

দেশীয় সুষম খাবার যেমন ডিম, ছোট মাছ, ডাল, লাল চাল/আটা ও পর্যাপ্ত শাকসবজি দিয়ে আপনি অনায়াসেই আপনার লক্ষ্যে পৌঁছাতে পারবেন। কোনো নির্দিষ্ট খাবার সম্পর্কে জানতে চাইলে জিজ্ঞেস করতে পারেন!`;
    }

    return { content, quickFollowUps };
  }
}
