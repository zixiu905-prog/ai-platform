export const WORKFLOW_TEMPLATES = {
  "image-processing": {
    name: "图像批处理工作流",
    description: "自动化图像处理和优化",
    category: "image",
    difficulty: "beginner",
    estimatedTime: "5-10分钟",
    tags: ["图像", "批处理", "自动化"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "resize",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "resizeImage",
          parameters: { width: 1920, height: 1080 },
          title: "调整尺寸",
          description: "将图像调整为指定尺寸",
        },
      },
      {
        id: "enhance",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "applyFilter",
          parameters: { filterName: "sharpen", parameters: { amount: 50 } },
          title: "图像增强",
          description: "应用锐化滤镜增强图像清晰度",
        },
      },
      {
        id: "export",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "saveDocument",
          parameters: { format: "JPG", quality: 85 },
          title: "导出图像",
          description: "保存处理后的图像",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "resize" },
      { from: "resize", to: "enhance" },
      { from: "enhance", to: "export" },
      { from: "export", to: "end" },
    ],
    variables: {
      inputFolder: {
        type: "string",
        description: "输入文件夹路径",
        required: true,
      },
      outputFolder: {
        type: "string",
        description: "输出文件夹路径",
        required: true,
      },
      width: { type: "number", description: "目标宽度", default: 1920 },
      height: { type: "number", description: "目标高度", default: 1080 },
      quality: { type: "number", description: "图像质量", default: 85 },
    },
  },

  "cad-conversion": {
    name: "CAD格式转换工作流",
    description: "自动化CAD文件格式转换和优化",
    category: "cad",
    difficulty: "intermediate",
    estimatedTime: "10-20分钟",
    tags: ["CAD", "格式转换", "批量处理"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "validate",
        type: "validation",
        position: { x: 300, y: 100 },
        config: {
          rules: [
            { field: "inputFile", type: "string", required: true },
            {
              field: "targetFormat",
              type: "string",
              required: true,
              options: ["DWG", "DXF", "DWF"],
            },
          ],
          title: "文件验证",
          description: "验证输入文件和目标格式",
        },
      },
      {
        id: "convert",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          softwareId: "autocad",
          action: "batchConvert",
          parameters: { targetFormat: "DWG", version: "2024" },
          title: "格式转换",
          description: "转换文件格式",
        },
      },
      {
        id: "cleanup",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          softwareId: "autocad",
          action: "layerCleanup",
          title: "图层清理",
          description: "清理无用图层和对象",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "validate" },
      { from: "validate", to: "convert" },
      { from: "convert", to: "cleanup" },
      { from: "cleanup", to: "end" },
    ],
    variables: {
      inputFile: {
        type: "string",
        description: "输入文件路径",
        required: true,
      },
      targetFormat: { type: "string", description: "目标格式", default: "DWG" },
      outputFile: {
        type: "string",
        description: "输出文件路径",
        required: true,
      },
    },
  },

  "3d-model-rendering": {
    name: "3D模型渲染工作流",
    description: "批量渲染3D模型和场景",
    category: "3d",
    difficulty: "advanced",
    estimatedTime: "30-60分钟",
    tags: ["3D", "渲染", "批量处理"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "load-scene",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          softwareId: "blender",
          action: "loadScene",
          title: "加载场景",
          description: "加载3D场景文件",
        },
      },
      {
        id: "setup-render",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          softwareId: "blender",
          action: "executeScript",
          parameters: {
            script: `
import bpy
scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.image_settings.file_format = 'PNG'
scene.cycles.samples = 128
            `,
          },
          title: "设置渲染参数",
          description: "配置渲染设置",
        },
      },
      {
        id: "render",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          softwareId: "blender",
          action: "renderScene",
          parameters: { resolution_x: 1920, resolution_y: 1080, samples: 128 },
          title: "执行渲染",
          description: "开始渲染过程",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "load-scene" },
      { from: "load-scene", to: "setup-render" },
      { from: "setup-render", to: "render" },
      { from: "render", to: "end" },
    ],
    variables: {
      sceneFile: {
        type: "string",
        description: "场景文件路径",
        required: true,
      },
      outputPath: { type: "string", description: "输出路径", required: true },
      resolution_x: { type: "number", description: "渲染宽度", default: 1920 },
      resolution_y: { type: "number", description: "渲染高度", default: 1080 },
      samples: { type: "number", description: "采样数量", default: 128 },
    },
  },

  "video-processing": {
    name: "视频处理工作流",
    description: "自动化视频编辑和导出",
    category: "video",
    difficulty: "intermediate",
    estimatedTime: "20-40分钟",
    tags: ["视频", "编辑", "导出"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "import",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          softwareId: "premiere",
          action: "importMedia",
          parameters: { mediaPaths: [] },
          title: "导入媒体",
          description: "导入视频和音频文件",
        },
      },
      {
        id: "create-sequence",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          softwareId: "premiere",
          action: "createSequence",
          parameters: { width: 1920, height: 1080, frameRate: 30 },
          title: "创建序列",
          description: "创建时间线序列",
        },
      },
      {
        id: "export",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          softwareId: "premiere",
          action: "exportVideo",
          parameters: { format: "H.264", quality: "high" },
          title: "导出视频",
          description: "导出最终视频",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "import" },
      { from: "import", to: "create-sequence" },
      { from: "create-sequence", to: "export" },
      { from: "export", to: "end" },
    ],
    variables: {
      mediaFiles: {
        type: "array",
        description: "媒体文件列表",
        required: true,
      },
      outputPath: {
        type: "string",
        description: "输出文件路径",
        required: true,
      },
      format: { type: "string", description: "输出格式", default: "H.264" },
      quality: { type: "string", description: "视频质量", default: "high" },
    },
  },

  "ai-content-generation": {
    name: "AI内容生成工作流",
    description: "使用AI自动生成内容并应用到设计软件",
    category: "ai",
    difficulty: "beginner",
    estimatedTime: "5-15分钟",
    tags: ["AI", "内容生成", "自动化"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "generate-content",
        type: "ai_processing",
        position: { x: 300, y: 100 },
        config: {
          model: "gpt-4",
          prompt: "请生成关于{topic}的创意内容，包括标题和描述",
          input: "topic",
          title: "AI内容生成",
          description: "使用AI模型生成内容",
        },
      },
      {
        id: "create-document",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "createDocument",
          parameters: { name: "AI生成内容", width: 1920, height: 1080 },
          title: "创建文档",
          description: "创建设计文档",
        },
      },
      {
        id: "apply-content",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "executeScript",
          parameters: {
            script: `
// 创建文本图层
var textLayer = app.activeDocument.artLayers.add();
textLayer.kind = LayerKind.TEXT;
var textItem = textLayer.textItem;
textItem.contents = content;
textItem.size = 48;
textItem.color = new SolidColor();
textItem.color.rgb.hexValue = '000000';
textItem.position = [100, 100];
            `,
          },
          title: "应用内容",
          description: "将AI生成的内容应用到文档",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "generate-content" },
      { from: "generate-content", to: "create-document" },
      { from: "create-document", to: "apply-content" },
      { from: "apply-content", to: "end" },
    ],
    variables: {
      topic: { type: "string", description: "生成主题", required: true },
      model: { type: "string", description: "AI模型", default: "gpt-4" },
      outputPath: { type: "string", description: "输出路径", required: true },
    },
  },

  "batch-file-conversion": {
    name: "批量文件转换工作流",
    description: "批量转换多种文件格式",
    category: "utility",
    difficulty: "beginner",
    estimatedTime: "10-30分钟",
    tags: ["批量处理", "文件转换", "自动化"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "scan-files",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          action: "scanFiles",
          parameters: { recursive: true, pattern: "*" },
          title: "扫描文件",
          description: "扫描输入文件夹中的文件",
        },
      },
      {
        id: "process-loop",
        type: "loop",
        position: { x: 500, y: 100 },
        config: {
          items: "files",
          variable: "file",
          subNodeId: "convert-file",
          maxIterations: 1000,
          title: "批量处理",
          description: "逐个处理文件",
        },
      },
      {
        id: "convert-file",
        type: "operation",
        position: { x: 700, y: 50 },
        config: {
          action: "convertFile",
          parameters: { targetFormat: "PDF" },
          title: "转换单个文件",
          description: "转换文件格式",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "scan-files" },
      { from: "scan-files", to: "process-loop" },
      { from: "process-loop", to: "end" },
    ],
    variables: {
      inputFolder: {
        type: "string",
        description: "输入文件夹",
        required: true,
      },
      outputFolder: {
        type: "string",
        description: "输出文件夹",
        required: true,
      },
      targetFormat: { type: "string", description: "目标格式", default: "PDF" },
      filePattern: { type: "string", description: "文件模式", default: "*" },
    },
  },

  "data-backup": {
    name: "数据备份工作流",
    description: "自动备份项目数据和文件",
    category: "utility",
    difficulty: "beginner",
    estimatedTime: "15-30分钟",
    tags: ["备份", "数据管理", "自动化"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "create-backup-folder",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          action: "createFolder",
          parameters: { name: "backup_{timestamp}" },
          title: "创建备份文件夹",
          description: "创建带时间戳的备份文件夹",
        },
      },
      {
        id: "copy-files",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          action: "copyFiles",
          parameters: { recursive: true, preservePermissions: true },
          title: "复制文件",
          description: "复制所有源文件到备份目录",
        },
      },
      {
        id: "compress-backup",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          action: "compressFolder",
          parameters: { format: "ZIP", compression: 9 },
          title: "压缩备份",
          description: "压缩备份文件夹",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "create-backup-folder" },
      { from: "create-backup-folder", to: "copy-files" },
      { from: "copy-files", to: "compress-backup" },
      { from: "compress-backup", to: "end" },
    ],
    variables: {
      sourcePath: { type: "string", description: "源路径", required: true },
      backupPath: { type: "string", description: "备份根目录", required: true },
      excludePatterns: {
        type: "array",
        description: "排除文件模式",
        default: ["*.tmp", "*.log"],
      },
    },
  },

  "image-watermark": {
    name: "图像水印添加工作流",
    description: "批量为图像添加水印",
    category: "image",
    difficulty: "intermediate",
    estimatedTime: "5-15分钟",
    tags: ["水印", "批处理", "图像处理"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "load-images",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "openDocument",
          title: "加载图像",
          description: "打开图像文件",
        },
      },
      {
        id: "add-watermark",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "executeScript",
          parameters: {
            script: `
// 创建水印图层
var watermarkLayer = app.activeDocument.artLayers.add();
watermarkLayer.name = "Watermark";

// 添加文本
var textItem = watermarkLayer.textItem;
textItem.contents = watermarkText;
textItem.size = fontSize;
textItem.color = new SolidColor();
textItem.color.rgb.hexValue = watermarkColor;

// 设置位置和透明度
textItem.position = [positionX, positionY];
watermarkLayer.opacity = opacity / 100;
            `,
          },
          title: "添加水印",
          description: "在图像上添加文本水印",
        },
      },
      {
        id: "save-with-watermark",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          softwareId: "photoshop",
          action: "saveDocument",
          parameters: { format: "JPG", quality: 90 },
          title: "保存图像",
          description: "保存带水印的图像",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "load-images" },
      { from: "load-images", to: "add-watermark" },
      { from: "add-watermark", to: "save-with-watermark" },
      { from: "save-with-watermark", to: "end" },
    ],
    variables: {
      inputFolder: {
        type: "string",
        description: "输入文件夹",
        required: true,
      },
      outputFolder: {
        type: "string",
        description: "输出文件夹",
        required: true,
      },
      watermarkText: {
        type: "string",
        description: "水印文本",
        required: true,
      },
      fontSize: { type: "number", description: "字体大小", default: 24 },
      watermarkColor: {
        type: "string",
        description: "水印颜色",
        default: "FFFFFF",
      },
      positionX: { type: "number", description: "X位置", default: 50 },
      positionY: { type: "number", description: "Y位置", default: 50 },
      opacity: { type: "number", description: "透明度", default: 70 },
    },
  },

  "pdf-generation": {
    name: "PDF文档生成工作流",
    description: "从多种文件格式生成PDF文档",
    category: "document",
    difficulty: "intermediate",
    estimatedTime: "10-20分钟",
    tags: ["PDF", "文档生成", "批量处理"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "collect-files",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          action: "collectFiles",
          parameters: {
            supportedFormats: ["DOC", "DOCX", "TXT", "JPG", "PNG"],
          },
          title: "收集文件",
          description: "收集支持的文件格式",
        },
      },
      {
        id: "convert-to-pdf",
        type: "operation",
        position: { x: 500, y: 100 },
        config: {
          action: "convertToPDF",
          parameters: { quality: "high", compression: true },
          title: "转换为PDF",
          description: "将文件转换为PDF格式",
        },
      },
      {
        id: "merge-pdf",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          action: "mergePDF",
          parameters: { preserveBookmarks: true },
          title: "合并PDF",
          description: "将多个PDF合并为一个文档",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "collect-files" },
      { from: "collect-files", to: "convert-to-pdf" },
      { from: "convert-to-pdf", to: "merge-pdf" },
      { from: "merge-pdf", to: "end" },
    ],
    variables: {
      inputFiles: {
        type: "array",
        description: "输入文件列表",
        required: true,
      },
      outputPath: {
        type: "string",
        description: "输出PDF路径",
        required: true,
      },
      pdfTitle: { type: "string", description: "PDF标题", default: "合并文档" },
      mergeOrder: {
        type: "string",
        description: "合并顺序",
        default: "filename",
      },
    },
  },

  "quality-check": {
    name: "质量检查工作流",
    description: "自动化检查设计文件质量和规范",
    category: "quality",
    difficulty: "advanced",
    estimatedTime: "15-25分钟",
    tags: ["质量检查", "验证", "自动化"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "analyze-files",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          action: "analyzeFiles",
          parameters: { deepAnalysis: true },
          title: "分析文件",
          description: "深度分析文件属性和结构",
        },
      },
      {
        id: "check-standards",
        type: "validation",
        position: { x: 500, y: 100 },
        config: {
          rules: [
            {
              field: "resolution",
              type: "number",
              min: 72,
              description: "检查分辨率",
            },
            {
              field: "colorMode",
              type: "string",
              options: ["RGB", "CMYK"],
              description: "检查颜色模式",
            },
            {
              field: "fileSize",
              type: "number",
              max: 10485760,
              description: "检查文件大小",
            },
          ],
          title: "标准检查",
          description: "验证文件是否符合设计标准",
        },
      },
      {
        id: "generate-report",
        type: "ai_processing",
        position: { x: 700, y: 100 },
        config: {
          model: "gpt-4",
          prompt: "基于分析结果生成质量报告和建议",
          input: "analysisResult",
          title: "生成报告",
          description: "生成详细的质量检查报告",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "analyze-files" },
      { from: "analyze-files", to: "check-standards" },
      { from: "check-standards", to: "generate-report" },
      { from: "generate-report", to: "end" },
    ],
    variables: {
      targetPath: {
        type: "string",
        description: "检查目标路径",
        required: true,
      },
      standards: {
        type: "object",
        description: "质量标准配置",
        required: true,
      },
      reportPath: {
        type: "string",
        description: "报告输出路径",
        required: true,
      },
      includeRecommendations: {
        type: "boolean",
        description: "包含改进建议",
        default: true,
      },
    },
  },

  "automated-testing": {
    name: "自动化测试工作流",
    description: "自动测试软件功能和性能",
    category: "testing",
    difficulty: "advanced",
    estimatedTime: "20-40分钟",
    tags: ["自动化测试", "性能测试", "质量保证"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "setup-environment",
        type: "operation",
        position: { x: 300, y: 100 },
        config: {
          action: "setupTestEnvironment",
          parameters: { cleanStart: true, backupData: true },
          title: "设置环境",
          description: "准备测试环境",
        },
      },
      {
        id: "run-tests",
        type: "loop",
        position: { x: 500, y: 100 },
        config: {
          items: "testCases",
          variable: "testCase",
          subNodeId: "execute-test",
          maxIterations: 50,
          title: "执行测试",
          description: "运行所有测试用例",
        },
      },
      {
        id: "execute-test",
        type: "operation",
        position: { x: 700, y: 50 },
        config: {
          action: "executeTestCase",
          parameters: { timeout: 300, retries: 3 },
          title: "执行测试用例",
          description: "执行单个测试用例",
        },
      },
      {
        id: "generate-report",
        type: "operation",
        position: { x: 900, y: 100 },
        config: {
          action: "generateTestReport",
          parameters: { format: "HTML", includeCharts: true },
          title: "生成测试报告",
          description: "生成详细的测试报告",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 1100, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "setup-environment" },
      { from: "setup-environment", to: "run-tests" },
      { from: "run-tests", to: "generate-report" },
      { from: "generate-report", to: "end" },
    ],
    variables: {
      testSuite: { type: "string", description: "测试套件", required: true },
      testCases: { type: "array", description: "测试用例列表", required: true },
      environment: {
        type: "string",
        description: "测试环境",
        default: "staging",
      },
      reportPath: {
        type: "string",
        description: "报告输出路径",
        required: true,
      },
      parallelExecution: {
        type: "boolean",
        description: "并行执行",
        default: false,
      },
    },
  },

  "content-optimization": {
    name: "内容优化工作流",
    description: "使用AI优化内容质量和SEO",
    category: "content",
    difficulty: "intermediate",
    estimatedTime: "10-20分钟",
    tags: ["内容优化", "SEO", "AI处理"],
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        config: { title: "开始" },
      },
      {
        id: "analyze-content",
        type: "ai_processing",
        position: { x: 300, y: 100 },
        config: {
          model: "gpt-4",
          prompt: "分析以下内容的质量、可读性和SEO表现",
          input: "originalContent",
          title: "内容分析",
          description: "使用AI分析原始内容",
        },
      },
      {
        id: "optimize-content",
        type: "ai_processing",
        position: { x: 500, y: 100 },
        config: {
          model: "gpt-4",
          prompt: "基于分析结果优化内容，提高质量和SEO表现",
          input: "analysisResult",
          title: "内容优化",
          description: "优化内容以提高质量和可读性",
        },
      },
      {
        id: "apply-optimization",
        type: "operation",
        position: { x: 700, y: 100 },
        config: {
          action: "applyContentChanges",
          parameters: { preserveOriginal: true, createBackup: true },
          title: "应用优化",
          description: "将优化应用到实际内容",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 100 },
        config: { title: "完成" },
      },
    ],
    edges: [
      { from: "start", to: "analyze-content" },
      { from: "analyze-content", to: "optimize-content" },
      { from: "optimize-content", to: "apply-optimization" },
      { from: "apply-optimization", to: "end" },
    ],
    variables: {
      contentPath: {
        type: "string",
        description: "内容文件路径",
        required: true,
      },
      targetKeywords: { type: "array", description: "目标关键词", default: [] },
      contentType: {
        type: "string",
        description: "内容类型",
        default: "article",
      },
      outputPath: {
        type: "string",
        description: "优化后输出路径",
        required: true,
      },
      optimizationLevel: {
        type: "string",
        description: "优化级别",
        default: "medium",
      },
    },
  },
};

export default WORKFLOW_TEMPLATES;
