-- 创建2025年最新订阅计划配置
INSERT INTO "subscription_plans" (
  "id", 
  "name", 
  "description", 
  "price", 
  "duration", 
  "durationDays", 
  "features", 
  "maxTokens", 
  "maxImages", 
  "aiModels", 
  "isActive", 
  "createdAt", 
  "updatedAt"
) VALUES 
-- 免费版
(
  'plan-free-2025',
  '免费版',
  '零门槛体验AI设计平台',
  0,
  30,
  30,
  JSONB_BUILD_OBJECT(
    'tokensIncluded', 1000000,
    'imagesIncluded', 50,
    'aiModels', JSONB_BUILD_ARRAY('glm-4-flash', 'doubao-pro-32k', 'embedding-2'),
    'features', JSONB_BUILD_ARRAY(
      '基础AI对话', '基础图像生成', '社区支持', '模板访问'
    ),
    'supportType', 'community',
    'maxWorkflows', 5,
    'maxScripts', 10,
    'storageSpace', '5GB'
  ),
  1000000,
  50,
  JSONB_BUILD_ARRAY('glm-4-flash', 'doubao-pro-32k', 'embedding-2'),
  true,
  NOW(),
  NOW()
),

-- 基础版-月付 (¥19/月)
(
  'plan-basic-monthly-2025',
  '基础版',
  '个人设计师超值选择',
  19.00,
  1,
  30,
  JSONB_BUILD_OBJECT(
    'tokensIncluded', 20000000,
    'imagesIncluded', 300,
    'aiModels', JSONB_BUILD_ARRAY(
      'glm-4-air', 'glm-4-flash', 'doubao-pro-32k', 'doubao-pro-128k', 
      'wenxin-4.5', 'qwen-max', 'embedding-2'
    ),
    'features', JSONB_BUILD_ARRAY(
      '中级AI模型', '高级图像生成', '工作流基础功能', '邮件支持', 
      '优先处理', '桌面应用完整功能'
    ),
    'supportType', 'email',
    'maxWorkflows', 20,
    'maxScripts', 50,
    'storageSpace', '50GB',
    'excessTokensPrice', 0.008,
    'excessImagesPrice', 0.015
  ),
  20000000,
  300,
  JSONB_BUILD_ARRAY('glm-4-air', 'glm-4-flash', 'doubao-pro-32k', 'doubao-pro-128k', 'wenxin-4.5', 'qwen-max', 'embedding-2'),
  true,
  NOW(),
  NOW()
),

-- 基础版-年付 (¥171/年, 相当于8折)
(
  'plan-basic-yearly-2025',
  '基础版 (年付)',
  '年付享受20%优惠',
  171.00,
  12,
  365,
  JSONB_BUILD_OBJECT(
    'tokensIncluded', 20000000,
    'imagesIncluded', 300,
    'aiModels', JSONB_BUILD_ARRAY(
      'glm-4-air', 'glm-4-flash', 'doubao-pro-32k', 'doubao-pro-128k', 
      'wenxin-4.5', 'qwen-max', 'embedding-2'
    ),
    'features', JSONB_BUILD_ARRAY(
      '中级AI模型', '高级图像生成', '工作流基础功能', '邮件支持', 
      '优先处理', '桌面应用完整功能', '年付专享优惠'
    ),
    'supportType', 'email',
    'maxWorkflows', 20,
    'maxScripts', 50,
    'storageSpace', '50GB',
    'excessTokensPrice', 0.008,
    'excessImagesPrice', 0.015,
    'discount', 0.2
  ),
  20000000,
  300,
  JSONB_BUILD_ARRAY('glm-4-air', 'glm-4-flash', 'doubao-pro-32k', 'doubao-pro-128k', 'wenxin-4.5', 'qwen-max', 'embedding-2'),
  true,
  NOW(),
  NOW()
),

-- 专业版-月付 (¥69/月)
(
  'plan-pro-monthly-2025',
  '专业版',
  '专业工作室性能之选',
  69.00,
  1,
  30,
  JSONB_BUILD_OBJECT(
    'tokensIncluded', 100000000,
    'imagesIncluded', 1500,
    'aiModels', JSONB_BUILD_ARRAY(
      'glm-4', 'glm-4-plus', 'glm-z1-airx', 'doubao-pro-128k', 
      'wenxin-x1', 'qwen-vl-max', 'deepseek-v3', 'all-vision-models', 'embedding-2'
    ),
    'features', JSONB_BUILD_ARRAY(
      '全功能AI模型', '无限工作流', '高级图像生成', 'API访问', 
      '优先技术支持', '桌面应用高级功能', '企业级安全'
    ),
    'supportType', 'priority',
    'maxWorkflows', 'unlimited',
    'maxScripts', 'unlimited',
    'storageSpace', '200GB',
    'excessTokensPrice', 0.006,
    'excessImagesPrice', 0.012,
    'apiAccess', true,
    'slaLevel', 'standard'
  ),
  100000000,
  1500,
  JSONB_BUILD_ARRAY('glm-4', 'glm-4-plus', 'glm-z1-airx', 'doubao-pro-128k', 'wenxin-x1', 'qwen-vl-max', 'deepseek-v3', 'all-vision-models', 'embedding-2'),
  true,
  NOW(),
  NOW()
),

-- 专业版-年付 (¥621/年, 相当于8折)
(
  'plan-pro-yearly-2025',
  '专业版 (年付)',
  '年付享受20%优惠',
  621.00,
  12,
  365,
  JSONB_BUILD_OBJECT(
    'tokensIncluded', 100000000,
    'imagesIncluded', 1500,
    'aiModels', JSONB_BUILD_ARRAY(
      'glm-4', 'glm-4-plus', 'glm-z1-airx', 'doubao-pro-128k', 
      'wenxin-x1', 'qwen-vl-max', 'deepseek-v3', 'all-vision-models', 'embedding-2'
    ),
    'features', JSONB_BUILD_ARRAY(
      '全功能AI模型', '无限工作流', '高级图像生成', 'API访问', 
      '优先技术支持', '桌面应用高级功能', '企业级安全', '年付专享优惠'
    ),
    'supportType', 'priority',
    'maxWorkflows', 'unlimited',
    'maxScripts', 'unlimited',
    'storageSpace', '200GB',
    'excessTokensPrice', 0.006,
    'excessImagesPrice', 0.012,
    'apiAccess', true,
    'slaLevel', 'standard',
    'discount', 0.2
  ),
  100000000,
  1500,
  JSONB_BUILD_ARRAY('glm-4', 'glm-4-plus', 'glm-z1-airx', 'doubao-pro-128k', 'wenxin-x1', 'qwen-vl-max', 'deepseek-v3', 'all-vision-models', 'embedding-2'),
  true,
  NOW(),
  NOW()
),

-- 企业版-月付 (¥299/月)
(
  'plan-enterprise-monthly-2025',
  '企业版',
  '企业客户顶级服务',
  299.00,
  1,
  30,
  JSONB_BUILD_OBJECT(
    'tokensIncluded', 500000000,
    'imagesIncluded', -1,
    'aiModels', JSONB_BUILD_ARRAY('all-models'),
    'features', JSONB_BUILD_ARRAY(
      '所有模型无限制', '无限图像生成', '私有化部署选项', '专属客户经理',
      '7×24技术支持', '99.9% SLA保障', '定制化服务', '数据隔离'
    ),
    'supportType', 'dedicated',
    'maxWorkflows', 'unlimited',
    'maxScripts', 'unlimited',
    'storageSpace', 'unlimited',
    'excessTokensPrice', 0.004,
    'excessImagesPrice', 0.01,
    'apiAccess', true,
    'slaLevel', 'premium',
    'privateDeployment', true,
    'customTraining', true,
    'multiTenant', true
  ),
  500000000,
  -1,
  JSONB_BUILD_ARRAY('all-models'),
  true,
  NOW(),
  NOW()
),

-- 企业版-年付 (¥2691/年, 相当于8折)
(
  'plan-enterprise-yearly-2025',
  '企业版 (年付)',
  '年付享受20%优惠',
  2691.00,
  12,
  365,
  JSONB_BUILD_OBJECT(
    'tokensIncluded', 500000000,
    'imagesIncluded', -1,
    'aiModels', JSONB_BUILD_ARRAY('all-models'),
    'features', JSONB_BUILD_ARRAY(
      '所有模型无限制', '无限图像生成', '私有化部署选项', '专属客户经理',
      '7×24技术支持', '99.9% SLA保障', '定制化服务', '数据隔离', '年付专享优惠'
    ),
    'supportType', 'dedicated',
    'maxWorkflows', 'unlimited',
    'maxScripts', 'unlimited',
    'storageSpace', 'unlimited',
    'excessTokensPrice', 0.004,
    'excessImagesPrice', 0.01,
    'apiAccess', true,
    'slaLevel', 'premium',
    'privateDeployment', true,
    'customTraining', true,
    'multiTenant', true,
    'discount', 0.2
  ),
  500000000,
  -1,
  JSONB_BUILD_ARRAY('all-models'),
  true,
  NOW(),
  NOW()
);

-- 创建2025年AI模型价格配置表
CREATE TABLE IF NOT EXISTS "ai_model_pricing_2025" (
  "id" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelType" TEXT NOT NULL,
  "inputPricePerK" DECIMAL(10,8) NOT NULL,
  "outputPricePerK" DECIMAL(10,8) NOT NULL,
  "maxTokens" INTEGER NOT NULL,
  "features" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_model_pricing_2025_pkey" PRIMARY KEY ("id")
);

-- 插入2025年最新的AI模型价格
INSERT INTO "ai_model_pricing_2025" (
  "id", "model", "provider", "modelType", "inputPricePerK", "outputPricePerK", "maxTokens", "features", "isActive"
) VALUES 

-- 智谱AI模型 (2025年最新价格)
('glm-4-flash-2025', 'glm-4-flashx', 'zhipu', 'text', 0.000001, 0.000002, 128000, 
 JSONB_BUILD_OBJECT('description', 'GLM-4-FlashX 超快推理速度', 'performance', 'fast'), true),
('glm-z1-air-2025', 'glm-z1-air', 'zhipu', 'text', 0.000005, 0.000015, 128000,
 JSONB_BUILD_OBJECT('description', 'GLM-Z1-Air 高性价比版本', 'performance', 'balanced'), true),
('glm-z1-airx-2025', 'glm-z1-airx', 'zhipu', 'text', 0.00005, 0.00015, 128000,
 JSONB_BUILD_OBJECT('description', 'GLM-Z1-AirX 8倍推理速度', 'performance', 'ultra-fast'), true),
('glm-4-plus-2025', 'glm-4-plus', 'zhipu', 'text', 0.000005, 0.000015, 128000,
 JSONB_BUILD_OBJECT('description', 'GLM-4 Plus 代码和数据分析专家', 'performance', 'advanced'), true),
('glm-4-air-2025', 'glm-4-air', 'zhipu', 'text', 0.0000006, 0.0000018, 128000,
 JSONB_BUILD_OBJECT('description', 'GLM-4 Air 轻量版本', 'performance', 'lightweight'), true),

-- 豆包AI模型 (2025年最新价格)
('doubao-pro-32k-2025', 'doubao-pro-32k', 'doubao', 'text', 0.0000008, 0.0000024, 32768,
 JSONB_BUILD_OBJECT('description', '豆包Pro 32K 长文本版本', 'performance', 'balanced'), true),
('doubao-pro-128k-2025', 'doubao-pro-128k', 'doubao', 'text', 0.000005, 0.000015, 131072,
 JSONB_BUILD_OBJECT('description', '豆包Pro 128K 超长文本', 'performance', 'long-context'), true),
('doubao-vision-2025', 'doubao-vision', 'doubao', 'vision', 0.000003, 0.000009, 8192,
 JSONB_BUILD_OBJECT('description', '豆包视觉理解模型', 'performance', 'multimodal'), true),

-- 百度文心模型 (2025年最新价格)
('wenxin-x1-2025', 'wenxin-x1', 'baidu', 'text', 0.000002, 0.000008, 128000,
 JSONB_BUILD_OBJECT('description', '文心X1 深度思考模型', 'performance', 'reasoning'), true),
('wenxin-4.5-2025', 'wenxin-4.5', 'baidu', 'multimodal', 0.000004, 0.000016, 128000,
 JSONB_BUILD_OBJECT('description', '文心4.5 多模态模型', 'performance', 'multimodal'), true),

-- 阿里通义模型 (2025年最新价格)
('qwen-max-2025', 'qwen-max', 'alibaba', 'text', 0.00004, 0.00012, 8192,
 JSONB_BUILD_OBJECT('description', '通义Max 性能旗舰', 'performance', 'flagship'), true),
('qwen-long-2025', 'qwen-long', 'alibaba', 'text', 0.0000005, 0.0000015, 1000000,
 JSONB_BUILD_OBJECT('description', '通义Long 超长上下文', 'performance', 'long-context'), true),
('qwen-vl-plus-2025', 'qwen-vl-plus', 'alibaba', 'vision', 0.0000015, 0.0000045, 8192,
 JSONB_BUILD_OBJECT('description', '通义VL Plus 视觉理解', 'performance', 'multimodal'), true),
('qwen-vl-max-2025', 'qwen-vl-max', 'alibaba', 'vision', 0.000003, 0.000009, 8192,
 JSONB_BUILD_OBJECT('description', '通义VL Max 高级视觉', 'performance', 'advanced-multimodal'), true),

-- DeepSeek模型 (2025年最新价格)
('deepseek-v3-2025', 'deepseek-v3', 'deepseek', 'text', 0.000002, 0.000008, 128000,
 JSONB_BUILD_OBJECT('description', 'DeepSeek V3 通用模型', 'performance', 'general'), true),
('deepseek-r1-2025', 'deepseek-r1', 'deepseek', 'reasoning', 0.000004, 0.000016, 64000,
 JSONB_BUILD_OBJECT('description', 'DeepSeek R1 推理专家', 'performance', 'reasoning'), true),

-- 图像生成模型 (2025年最新价格)
('dall-e-3-2025', 'dall-e-3', 'openai', 'image', 0.04, 0, 0,
 JSONB_BUILD_OBJECT('description', 'DALL-E 3 图像生成', 'resolution', JSONB_BUILD_ARRAY('1024x1024', '1792x1024')), true),
('stable-diffusion-2025', 'stable-diffusion-xl', 'stability', 'image', 0.02, 0, 0,
 JSONB_BUILD_OBJECT('description', 'Stable Diffusion XL 图像生成', 'resolution', JSONB_BUILD_ARRAY('512x512', '768x768', '1024x1024')), true),

-- Embedding模型 (2025年最新价格)
('embedding-2-2025', 'embedding-2', 'zhipu', 'embedding', 0.0000003, 0, 8192,
 JSONB_BUILD_OBJECT('description', 'Embedding-2 文本向量化', 'dimensions', 1024), true);