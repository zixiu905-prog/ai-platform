// 预置设计模板

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'material' | 'graphics' | 'photoshop' | 'interior' | 'landscape';
  definition: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      config: any;
      position: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
    settings: {
      timeout?: number;
      retries?: number;
      parallel?: boolean;
    };
  };
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  softwareRequirements: string[];
  preview?: string;
}

export const DESIGN_TEMPLATES: Record<string, DesignTemplate> = {
  // 物料排版模板
  'material-poster-basic': {
    id: 'material-poster-basic',
    name: '基础海报排版',
    description: '适用于宣传海报、产品海报的基础排版模板',
    category: 'material',
    definition: {
      nodes: [
        {
          id: 'input',
          type: 'input',
          label: '输入文字内容',
          config: {
            placeholder: '请输入海报标题和内容...',
            maxLength: 500
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'layout',
          type: 'layout',
          label: '自动排版',
          config: {
            template: 'poster-basic',
            fontSize: {
              title: 48,
              subtitle: 24,
              content: 16
            },
            spacing: 20,
            margins: 40
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'export',
          type: 'export',
          label: '导出文件',
          config: {
            formats: ['jpg', 'png', 'pdf'],
            quality: 'high',
            dimensions: 'A4'
          },
          position: { x: 500, y: 50 }
        }
      ],
      edges: [
        { id: 'e1', source: 'input', target: 'layout' },
        { id: 'e2', source: 'layout', target: 'export' }
      ],
      settings: {
        timeout: 300,
        retries: 2
      }
    },
    tags: ['海报', '排版', '基础'],
    difficulty: 'beginner',
    estimatedTime: '5-10分钟',
    softwareRequirements: ['illustrator', 'photoshop'],
    preview: '/images/templates/material-poster-basic.png'
  },

  'material-catalog-layout': {
    id: 'material-catalog-layout',
    name: '产品目录排版',
    description: '适用于产品展示目录的多页面排版模板',
    category: 'material',
    definition: {
      nodes: [
        {
          id: 'data-import',
          type: 'data_import',
          label: '导入产品数据',
          config: {
            supportedFormats: ['csv', 'json', 'excel'],
            fields: ['name', 'description', 'price', 'image']
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'template-select',
          type: 'template_selector',
          label: '选择目录模板',
          config: {
            templates: ['grid-2col', 'grid-3col', 'list-view'],
            defaultTemplate: 'grid-3col'
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'auto-layout',
          type: 'auto_layout',
          label: '自动排版',
          config: {
            itemPerPage: 6,
            includePrice: true,
            includeDescription: true,
            imageSize: 'medium'
          },
          position: { x: 500, y: 50 }
        },
        {
          id: 'export-pdf',
          type: 'export_pdf',
          label: '导出PDF目录',
          config: {
            pageSize: 'A4',
            includeIndex: true,
            includeTableOfContents: true
          },
          position: { x: 700, y: 50 }
        }
      ],
      edges: [
        { id: 'e1', source: 'data-import', target: 'template-select' },
        { id: 'e2', source: 'template-select', target: 'auto-layout' },
        { id: 'e3', source: 'auto-layout', target: 'export-pdf' }
      ],
      settings: {
        timeout: 600,
        retries: 3
      }
    },
    tags: ['目录', '产品', '多页面'],
    difficulty: 'intermediate',
    estimatedTime: '15-30分钟',
    softwareRequirements: ['indesign'],
    preview: '/images/templates/material-catalog-layout.png'
  },

  // 常规图形模板
  'graphics-logo-design': {
    id: 'graphics-logo-design',
    name: 'Logo设计辅助',
    description: '辅助logo设计和矢量图形创建的模板',
    category: 'graphics',
    definition: {
      nodes: [
        {
          id: 'brief-input',
          type: 'text_input',
          label: '品牌简报',
          config: {
            fields: ['companyName', 'industry', 'style', 'colors'],
            placeholder: '输入品牌信息...'
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'ai-generate',
          type: 'ai_generate',
          label: 'AI生成概念',
          config: {
            model: 'dall-e-3',
            count: 4,
            style: 'vector'
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'vector-trace',
          type: 'vector_trace',
          label: '矢量化',
          config: {
            accuracy: 'high',
            cleanup: true,
            simplify: true
          },
          position: { x: 500, y: 50 }
        },
        {
          id: 'format-export',
          type: 'format_export',
          label: '格式导出',
          config: {
            formats: ['ai', 'svg', 'eps', 'pdf'],
            colorSpace: 'CMYK'
          },
          position: { x: 700, y: 50 }
        }
      ],
      edges: [
        { id: 'e1', source: 'brief-input', target: 'ai-generate' },
        { id: 'e2', source: 'ai-generate', target: 'vector-trace' },
        { id: 'e3', source: 'vector-trace', target: 'format-export' }
      ],
      settings: {
        timeout: 300,
        retries: 2
      }
    },
    tags: ['logo', '品牌', '矢量'],
    difficulty: 'intermediate',
    estimatedTime: '20-40分钟',
    softwareRequirements: ['illustrator', 'coreldraw'],
    preview: '/images/templates/graphics-logo-design.png'
  },

  // Photoshop工作模板
  'photoshop-portrait-retouch': {
    id: 'photoshop-portrait-retouch',
    name: '人像精修工作流',
    description: '专业的人像照片精修和美化工作流',
    category: 'photoshop',
    definition: {
      nodes: [
        {
          id: 'photo-input',
          type: 'file_input',
          label: '导入照片',
          config: {
            supportedFormats: ['jpg', 'png', 'tiff', 'raw'],
            maxFileSize: '50MB'
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'face-detection',
          type: 'face_detection',
          label: '人脸识别',
          config: {
            detectFeatures: ['eyes', 'nose', 'mouth', 'face'],
            accuracy: 'high'
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'skin-smoothing',
          type: 'skin_smoothing',
          label: '皮肤磨皮',
          config: {
            intensity: 30,
            preserveDetails: true,
            naturalLook: true
          },
          position: { x: 100, y: 200 }
        },
        {
          id: 'eye-enhancement',
          type: 'eye_enhancement',
          label: '眼部增强',
          config: {
            brighten: true,
            sharpen: true,
            removeRedEye: true
          },
          position: { x: 300, y: 200 }
        },
        {
          id: 'color-correction',
          type: 'color_correction',
          label: '色彩校正',
          config: {
            autoWhiteBalance: true,
            enhanceContrast: true,
            saturationBoost: 10
          },
          position: { x: 500, y: 200 }
        },
        {
          id: 'final-output',
          type: 'output',
          label: '输出结果',
          config: {
            formats: ['jpg', 'png'],
            quality: 'high',
            watermark: false
          },
          position: { x: 700, y: 200 }
        }
      ],
      edges: [
        { id: 'e1', source: 'photo-input', target: 'face-detection' },
        { id: 'e2', source: 'face-detection', target: 'skin-smoothing' },
        { id: 'e3', source: 'face-detection', target: 'eye-enhancement' },
        { id: 'e4', source: 'skin-smoothing', target: 'color-correction' },
        { id: 'e5', source: 'eye-enhancement', target: 'color-correction' },
        { id: 'e6', source: 'color-correction', target: 'final-output' }
      ],
      settings: {
        timeout: 180,
        retries: 1,
        parallel: true
      }
    },
    tags: ['人像', '精修', 'photoshop'],
    difficulty: 'advanced',
    estimatedTime: '10-20分钟',
    softwareRequirements: ['photoshop'],
    preview: '/images/templates/photoshop-portrait-retouch.png'
  },

  'photoshop-batch-process': {
    id: 'photoshop-batch-process',
    name: '批量图片处理',
    description: '批量处理多张图片的标准化操作',
    category: 'photoshop',
    definition: {
      nodes: [
        {
          id: 'batch-input',
          type: 'batch_input',
          label: '批量导入',
          config: {
            maxFiles: 100,
            supportedFormats: ['jpg', 'png', 'tiff'],
            enablePreview: true
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'resize-config',
          type: 'resize_config',
          label: '尺寸设置',
          config: {
            modes: ['fixed', 'percentage', 'max-dimension'],
            defaultMode: 'percentage',
            defaultValue: 80
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'quality-config',
          type: 'quality_config',
          label: '质量设置',
          config: {
            jpegQuality: 85,
            compression: 'medium',
            optimizeForWeb: true
          },
          position: { x: 500, y: 50 }
        },
        {
          id: 'batch-process',
          type: 'batch_process',
          label: '批量处理',
          config: {
            enableProgress: true,
            parallelProcessing: true,
            maxConcurrency: 4
          },
          position: { x: 300, y: 200 }
        },
        {
          id: 'batch-export',
          type: 'batch_export',
          label: '批量导出',
          config: {
            outputFolder: 'processed',
            namingPattern: '{name}_{timestamp}',
            includeOriginal: false
          },
          position: { x: 600, y: 200 }
        }
      ],
      edges: [
        { id: 'e1', source: 'batch-input', target: 'resize-config' },
        { id: 'e2', source: 'batch-input', target: 'quality-config' },
        { id: 'e3', source: 'resize-config', target: 'batch-process' },
        { id: 'e4', source: 'quality-config', target: 'batch-process' },
        { id: 'e5', source: 'batch-process', target: 'batch-export' }
      ],
      settings: {
        timeout: 600,
        retries: 2
      }
    },
    tags: ['批量', '处理', 'photoshop'],
    difficulty: 'intermediate',
    estimatedTime: '5-15分钟/批次',
    softwareRequirements: ['photoshop'],
    preview: '/images/templates/photoshop-batch-process.png'
  },

  // 室内外装修模板
  'interior-room-planning': {
    id: 'interior-room-planning',
    name: '室内空间规划',
    description: '完整的室内空间规划和3D可视化工作流',
    category: 'interior',
    definition: {
      nodes: [
        {
          id: 'room-input',
          type: 'room_parameters',
          label: '房间参数',
          config: {
            dimensions: { length: 'number', width: 'number', height: 'number' },
            roomType: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'office'],
            style: ['modern', 'classic', 'minimalist']
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'furniture-library',
          type: 'furniture_library',
          label: '家具库',
          config: {
            categories: ['seating', 'tables', 'storage', 'lighting', 'decoration'],
            styleFilter: 'auto'
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'auto-arrange',
          type: 'auto_arrange',
          label: '智能布局',
          config: {
            optimizeFlow: true,
            considerWindows: true,
            minSpaceBetween: 60
          },
          position: { x: 500, y: 50 }
        },
        {
          id: '3d-visualization',
          type: '3d_visualization',
          label: '3D可视化',
          config: {
            rendering: 'medium',
            lighting: 'realistic',
            materials: 'high-quality'
          },
          position: { x: 100, y: 200 }
        },
        {
          id: 'floor-plan',
          type: 'floor_plan',
          label: '平面图生成',
          config: {
            scale: '1:50',
            includeDimensions: true,
            includeFurniture: true
          },
          position: { x: 300, y: 200 }
        },
        {
          id: 'material-list',
          type: 'material_list',
          label: '材料清单',
          config: {
            includeQuantities: true,
            includePrices: true,
            exportFormat: 'excel'
          },
          position: { x: 500, y: 200 }
        }
      ],
      edges: [
        { id: 'e1', source: 'room-input', target: 'furniture-library' },
        { id: 'e2', source: 'furniture-library', target: 'auto-arrange' },
        { id: 'e3', source: 'room-input', target: '3d-visualization' },
        { id: 'e4', source: 'auto-arrange', target: '3d-visualization' },
        { id: 'e5', source: 'auto-arrange', target: 'floor-plan' },
        { id: 'e6', source: '3d-visualization', target: 'material-list' }
      ],
      settings: {
        timeout: 300,
        retries: 2
      }
    },
    tags: ['室内', '规划', '3D'],
    difficulty: 'advanced',
    estimatedTime: '30-60分钟',
    softwareRequirements: ['autocad', 'sketchup', '3dsmax'],
    preview: '/images/templates/interior-room-planning.png'
  },

  'exterior-facade-design': {
    id: 'exterior-facade-design',
    name: '建筑外观设计',
    description: '建筑外观和立面的设计工作流',
    category: 'interior',
    definition: {
      nodes: [
        {
          id: 'site-input',
          type: 'site_parameters',
          label: '场地参数',
          config: {
            location: 'text',
            dimensions: { width: 'number', depth: 'number', height: 'number' },
            buildingType: ['residential', 'commercial', 'office']
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'facade-style',
          type: 'facade_selector',
          label: '立面风格',
          config: {
            styles: ['modern', 'traditional', 'contemporary', 'industrial'],
            materials: ['brick', 'glass', 'concrete', 'steel', 'wood']
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'window-door-design',
          type: 'opening_designer',
          label: '门窗设计',
          config: {
            windowStyles: ['casement', 'double-hung', 'sliding', 'fixed'],
            doorStyles: ['single', 'double', 'sliding', 'french']
          },
          position: { x: 500, y: 50 }
        },
        {
          id: 'elevation-drawing',
          type: 'elevation_generator',
          label: '立面图生成',
          config: {
            views: ['front', 'back', 'left', 'right'],
            includeDimensions: true,
            scale: '1:100'
          },
          position: { x: 100, y: 200 }
        },
        {
          id: 'material-specification',
          type: 'material_spec',
          label: '材料规格',
          config: {
            includeFinish: true,
            includeColor: true,
            includeTexture: true
          },
          position: { x: 300, y: 200 }
        }
      ],
      edges: [
        { id: 'e1', source: 'site-input', target: 'facade-style' },
        { id: 'e2', source: 'facade-style', target: 'window-door-design' },
        { id: 'e3', source: 'site-input', target: 'elevation-drawing' },
        { id: 'e4', source: 'window-door-design', target: 'material-specification' }
      ],
      settings: {
        timeout: 400,
        retries: 3
      }
    },
    tags: ['建筑', '外观', '立面'],
    difficulty: 'advanced',
    estimatedTime: '60-120分钟',
    softwareRequirements: ['autocad', 'revit'],
    preview: '/images/templates/exterior-facade-design.png'
  },

  // 园林景观模板
  'landscape-garden-design': {
    id: 'landscape-garden-design',
    name: '园林景观设计',
    description: '完整的园林景观设计和植物配置工作流',
    category: 'landscape',
    definition: {
      nodes: [
        {
          id: 'site-analysis',
          type: 'site_analysis',
          label: '场地分析',
          config: {
            area: 'number',
            soilType: ['clay', 'loam', 'sand', 'silt'],
            climate: ['temperate', 'tropical', 'arid', 'continental'],
            sunExposure: ['full', 'partial', 'shade']
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'plant-library',
          type: 'plant_database',
          label: '植物数据库',
          config: {
            categories: ['trees', 'shrubs', 'flowers', 'grass', 'groundcover'],
            filters: ['climate', 'soil', 'sun', 'water']
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'layout-planning',
          type: 'landscape_layout',
          label: '景观布局',
          config: {
            zones: ['entrance', 'patio', 'lawn', 'garden-beds', 'water-feature'],
            pathways: 'auto-generate',
            lighting: 'included'
          },
          position: { x: 500, y: 50 }
        },
        {
          id: 'planting-plan',
          type: 'planting_scheme',
          label: '种植方案',
          config: {
            seasonalPlanning: true,
            companionPlanting: true,
            nativePlants: true,
            maintenance: 'low'
          },
          position: { x: 100, y: 200 }
        },
        {
          id: 'irrigation-design',
          type: 'irrigation_system',
          label: '灌溉系统',
          config: {
            systemType: ['drip', 'sprinkler', 'soaker'],
            zones: 'auto-calc',
            waterConservation: true
          },
          position: { x: 300, y: 200 }
        },
        {
          id: 'maintenance-schedule',
          type: 'maintenance_plan',
          label: '维护计划',
          config: {
            tasks: ['watering', 'pruning', 'fertilizing', 'pest-control'],
            schedule: 'monthly',
            reminders: true
          },
          position: { x: 500, y: 200 }
        }
      ],
      edges: [
        { id: 'e1', source: 'site-analysis', target: 'plant-library' },
        { id: 'e2', source: 'site-analysis', target: 'layout-planning' },
        { id: 'e3', source: 'plant-library', target: 'planting-plan' },
        { id: 'e4', source: 'layout-planning', target: 'irrigation-design' },
        { id: 'e5', source: 'planting-plan', target: 'maintenance-schedule' }
      ],
      settings: {
        timeout: 300,
        retries: 2
      }
    },
    tags: ['园林', '景观', '植物'],
    difficulty: 'advanced',
    estimatedTime: '45-90分钟',
    softwareRequirements: ['autocad', 'sketchup', 'vectorworks'],
    preview: '/images/templates/landscape-garden-design.png'
  },

  'landscape-hardscape': {
    id: 'landscape-hardscape',
    name: '硬景设计',
    description: '园林硬景（小径、露台、围栏等）设计工作流',
    category: 'landscape',
    definition: {
      nodes: [
        {
          id: 'hardscape-input',
          type: 'hardscape_requirements',
          label: '硬景需求',
          config: {
            elements: ['pathways', 'patios', 'decks', 'fences', 'walls', 'water-features'],
            materials: ['stone', 'wood', 'concrete', 'brick', 'metal'],
            budget: 'number'
          },
          position: { x: 100, y: 50 }
        },
        {
          id: 'pathway-design',
          type: 'pathway_generator',
          label: '路径设计',
          config: {
            styles: ['curved', 'straight', 'meandering'],
            widths: [60, 90, 120, 150],
            materials: ['gravel', 'stone', 'pavers', 'wood']
          },
          position: { x: 300, y: 50 }
        },
        {
          id: 'patio-design',
          type: 'patio_designer',
          label: '露台设计',
          config: {
            shapes: ['rectangular', 'circular', 'l-shaped', 'freeform'],
            coverings: ['pavers', 'concrete', 'wood', 'stone'],
            drainage: 'included'
          },
          position: { x: 500, y: 50 }
        },
        {
          id: 'structure-design',
          type: 'structure_generator',
          label: '结构设计',
          config: {
            fenceStyles: ['privacy', 'decorative', 'security', 'rail'],
            wallTypes: ['retaining', 'decorative', 'privacy'],
            gateDesigns: ['single', 'double', 'automatic']
          },
          position: { x: 100, y: 200 }
        },
        {
          id: 'construction-drawings',
          type: 'construction_docs',
          label: '施工图',
          config: {
            drawings: ['layout', 'details', 'sections', 'elevations'],
            dimensions: true,
            materials: true,
            annotations: true
          },
          position: { x: 300, y: 200 }
        }
      ],
      edges: [
        { id: 'e1', source: 'hardscape-input', target: 'pathway-design' },
        { id: 'e2', source: 'hardscape-input', target: 'patio-design' },
        { id: 'e3', source: 'pathway-design', target: 'structure-design' },
        { id: 'e4', source: 'patio-design', target: 'structure-design' },
        { id: 'e5', source: 'structure-design', target: 'construction-drawings' }
      ],
      settings: {
        timeout: 350,
        retries: 2
      }
    },
    tags: ['硬景', '路径', '露台'],
    difficulty: 'intermediate',
    estimatedTime: '30-60分钟',
    softwareRequirements: ['autocad', 'sketchup'],
    preview: '/images/templates/landscape-hardscape.png'
  }
};

// 获取所有模板
export const getAllTemplates = (): DesignTemplate[] => {
  return Object.values(DESIGN_TEMPLATES);
};

// 按分类获取模板
export const getTemplatesByCategory = (category: DesignTemplate['category']): DesignTemplate[] => {
  return Object.values(DESIGN_TEMPLATES).filter(template => template.category === category);
};

// 获取模板
export const getTemplateById = (id: string): DesignTemplate | undefined => {
  return DESIGN_TEMPLATES[id];
};

// 搜索模板
export const searchTemplates = (query: string): DesignTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(DESIGN_TEMPLATES).filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};
