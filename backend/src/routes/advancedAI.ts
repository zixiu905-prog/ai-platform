import { Router, Request, Response } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import {
  advancedAIService,
  ImageGenerationOptions,
  SpeechSynthesisOptions,
  DesignSuggestionOptions,
  AIDesignAssistantOptions,
} from "@/services/advancedAIService";
import { logger } from "@/utils/logger";

const router = Router();

// 图像生成
router.post(
  "/image-generation",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const options: ImageGenerationOptions = {
        prompt: req.body.prompt,
        negative_prompt: req.body.negative_prompt,
        width: req.body.width,
        height: req.body.height,
        steps: req.body.steps,
        guidance_scale: req.body.guidance_scale,
        seed: req.body.seed,
        style: req.body.style,
        model: req.body.model,
        quality: req.body.quality,
        n: req.body.n,
      };

      if (!options.prompt) {
        return res.status(400).json({
          success: false,
          error: "缺少必需的参数: prompt",
        });
      }
      logger.info("用户请求图像生成", {
        userId: req.user?.id,
        prompt: options.prompt,
      });

      const result = await advancedAIService.generateImage(options);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("图像生成失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "图像生成失败",
      });
    }
  },
);

// 批量图像生成
router.post(
  "/image-generation/batch",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { optionsArray } = req.body;

      if (!Array.isArray(optionsArray) || optionsArray.length === 0) {
        return res.status(400).json({
          success: false,
          error: "请提供有效的图像生成选项数组",
        });
      }
      if (optionsArray.length > 10) {
        return res.status(400).json({
          success: false,
          error: "批量生成最多支持10个请求",
        });
      }
      logger.info("用户请求批量图像生成", {
        userId: req.user?.id,
        count: optionsArray.length,
      });

      const results = await advancedAIService.batchGenerateImages(optionsArray);

      res.json({
        success: true,
        data: {
          results,
          total: optionsArray.length,
          successful: results.length,
          failed: optionsArray.length - results.length,
        },
      });
    } catch (error) {
      logger.error("批量图像生成失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "批量图像生成失败",
      });
    }
  },
);

// 语音合成
router.post(
  "/speech-synthesis",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const options: SpeechSynthesisOptions = {
        text: req.body.text,
        voice: req.body.voice,
        model: req.body.model,
        speed: req.body.speed,
        pitch: req.body.pitch,
        format: req.body.format,
        language: req.body.language,
        provider: req.body.provider,
      };

      if (!options.text) {
        return res.status(400).json({
          success: false,
          error: "缺少必需的参数: text",
        });
      }
      if (options.text.length > 5000) {
        return res.status(400).json({
          success: false,
          error: "文本长度不能超过5000个字符",
        });
      }
      logger.info("用户请求语音合成", {
        userId: req.user?.id,
        length: options.text.length,
      });

      const result = await advancedAIService.synthesizeSpeech(options);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("语音合成失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "语音合成失败",
      });
    }
  },
);

// 设计建议
router.post(
  "/design-suggestion",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const options: DesignSuggestionOptions = {
        type: req.body.type,
        description: req.body.description,
        target_audience: req.body.target_audience,
        brand_colors: req.body.brand_colors,
        style_preference: req.body.style_preference,
        industry: req.body.industry,
        context: req.body.context,
      };

      const validTypes = [
        "logo",
        "poster",
        "ui",
        "presentation",
        "social_media",
      ];
      if (!options.type || !validTypes.includes(options.type)) {
        return res.status(400).json({
          success: false,
          error: `无效的设计类型，支持的类型: ${validTypes.join(", ")}`,
        });
      }
      if (!options.description) {
        return res.status(400).json({
          success: false,
          error: "缺少必需的参数: description",
        });
      }
      logger.info("用户请求设计建议", {
        userId: req.user?.id,
        type: options.type,
      });

      const result = await advancedAIService.getDesignSuggestion(options);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("设计建议生成失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "设计建议生成失败",
      });
    }
  },
);

// AI设计助手
router.post(
  "/design-assistant",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const options: AIDesignAssistantOptions = {
        task: req.body.task,
        current_design: req.body.current_design,
        requirements: req.body.requirements,
        constraints: req.body.constraints,
        tools_available: req.body.tools_available,
        target_format: req.body.target_format,
        expertise_level: req.body.expertise_level,
      };

      if (!options.task) {
        return res.status(400).json({
          success: false,
          error: "缺少必需的参数: task",
        });
      }
      const validLevels = ["beginner", "intermediate", "expert"];
      if (
        options.expertise_level &&
        !validLevels.includes(options.expertise_level)
      ) {
        return res.status(400).json({
          success: false,
          error: `无效的技能水平，支持的级别: ${validLevels.join(", ")}`,
        });
      }
      logger.info("用户请求AI设计助手", {
        userId: req.user?.id,
        task: options.task,
      });

      const result = await advancedAIService.getDesignAssistantAdvice(options);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("AI设计助手失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "AI设计助手失败",
      });
    }
  },
);

// 获取支持的功能
router.get("/features", authenticate, (req: Request, res: Response) => {
  try {
    const features = advancedAIService.getSupportedFeatures();

    res.json({
      success: true,
      data: features,
    });
  } catch (error) {
    logger.error("获取支持功能失败:", error);
    res.status(500).json({
      success: false,
      error: "获取支持功能失败",
    });
  }
});

// 获取预设模板
router.get("/templates", authenticate, (req: Request, res: Response) => {
  try {
    const templates = {
      image_generation: {
        logo_design: {
          name: "Logo设计",
          description: "生成专业的企业或品牌Logo",
          template: {
            prompt:
              "Professional logo design for {company_name}, {industry} industry, modern minimalist, style, vector, logo, clean lines",
            width: 1024,
            height: 1024,
            style: "vivid",
            model: "dall-e-3",
          },
        },
        poster_design: {
          name: "海报设计",
          description: "创建吸引人的活动或产品海报",
          template: {
            prompt:
              "Eye-catching poster design for {event_type}, {theme} theme, modern, design, vibrant, colors, professional typography",
            width: 1024,
            height: 1408,
            style: "vivid",
            model: "dall-e-3",
          },
        },
        ui_mockup: {
          name: "UI界面设计",
          description: "设计应用程序或网站的界面",
          template: {
            prompt:
              "Modern {app_type} UI, design, {color_scheme} color, scheme, clean, interface, user-friendly, layout, mobile app design",
            width: 1024,
            height: 768,
            style: "natural",
            model: "dall-e-3",
          },
        },
        social_media: {
          name: "社交媒体图片",
          description: "为社交媒体平台创建内容图片",
          template: {
            prompt:
              "Engaging social media post for {platform}, {content_type}, {brand_style} style, eye-catching, shareable content",
            width: 1080,
            height: 1080,
            style: "vivid",
            model: "dall-e-3",
          },
        },
      },
      speech_synthesis: {
        narration: {
          name: "旁白解说",
          description: "为视频或演示制作旁白",
          template: {
            voice: "zh_male_jinguan",
            speed: 1.0,
            format: "mp3",
            provider: "zhipu",
          },
        },
        character_voice: {
          name: "角色配音",
          description: "为动画或游戏角色配音",
          template: {
            voice: "alloy",
            speed: 1.1,
            format: "mp3",
            provider: "openai",
          },
        },
        announcement: {
          name: "公告通知",
          description: "系统或活动通知语音",
          template: {
            voice: "zh_female_qingxin",
            speed: 0.9,
            format: "mp3",
            provider: "doubao",
          },
        },
      },
      design_assistance: {
        startup_branding: {
          name: "创业品牌设计",
          description: "为新创公司提供品牌设计指导",
          template: {
            type: "logo",
            target_audience: "年轻的创业者",
            industry: "科技",
            style_preference: "现代简约",
          },
        },
        event_promotion: {
          name: "活动宣传设计",
          description: "为活动或会议设计宣传材料",
          template: {
            type: "poster",
            target_audience: "目标参与者",
            industry: "活动策划",
            context: "线上线下结合",
          },
        },
      },
    };

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error("获取预设模板失败:", error);
    res.status(500).json({
      success: false,
      error: "获取预设模板失败",
    });
  }
});

// AI使用统计 (管理员)
router.get(
  "/usage-stats",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // 这里应该从数据库获取实际使用统计
      const stats = {
        total_requests: {
          image_generation: 1250,
          speech_synthesis: 890,
          design_suggestion: 670,
          design_assistant: 430,
        },
        monthly_growth: {
          image_generation: 15.2,
          speech_synthesis: 12.8,
          design_suggestion: 18.5,
          design_assistant: 22.3,
        },
        popular_models: {
          "dall-e-3": 450,
          "stable-diffusion": 380,
          "zhipu-tts": 290,
          "doubao-tts": 220,
        },
        average_processing_time: {
          image_generation: 85000, // ms
          speech_synthesis: 12000,
          design_suggestion: 45000,
          design_assistant: 78000,
        },
        cost_analysis: {
          daily_average: 45.6,
          monthly_total: 1368,
          cost_per_request: {
            image_generation: 0.08,
            speech_synthesis: 0.02,
            design_suggestion: 0.15,
            design_assistant: 0.25,
          },
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("获取使用统计失败:", error);
      res.status(500).json({
        success: false,
        error: "获取使用统计失败",
      });
    }
  },
);

// AI功能健康检查
router.get("/health", authenticate, async (req: Request, res: Response) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "Advanced AI",
      version: "1.0.0",
      features: {
        image_generation: {
          openai: !!process.env.OPENAI_API_KEY,
          stability: !!process.env.STABILITY_API_KEY,
          doubao: !!process.env.DOUBAO_API_KEY,
        },
        speech_synthesis: {
          openai: !!process.env.OPENAI_API_KEY,
          zhipu: !!process.env.ZHIPU_API_KEY,
          doubao: !!process.env.DOUBAO_API_KEY,
          azure: !!process.env.AZURE_SPEECH_KEY,
        },
        design_assistance: {
          zhipu: !!process.env.ZHIPU_API_KEY,
          doubao: !!process.env.DOUBAO_API_KEY,
        },
      },
      supported_models: advancedAIService.getSupportedFeatures(),
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error("AI健康检查失败:", error);
    res.status(500).json({
      success: false,
      error: "AI健康检查失败",
    });
  }
});

export default router;
