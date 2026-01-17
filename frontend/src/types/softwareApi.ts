// 软件API管理相关的类型定义

export interface Software {
  id: string
  name: string
  displayName: string
  category: string
  vendor?: string
  platforms: string[]
  version: string
  description?: string
  features: string[]
  apiEndpoint?: string
  officialApi?: string
  icon?: string
  isActive: boolean
  autoDetection: boolean
  createdAt: string
  updatedAt: string
}

export interface SoftwareVersion {
  id: string
  softwareId: string
  version: string
  releaseDate: string
  apiVersion: string
  downloadUrl?: string
  changelog?: string
  isLatest: boolean
  isSupported: boolean
  deprecationDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SoftwareApi {
  id: string
  softwareId: string
  version: string
  apiVersion: string
  apiSpec?: any // OpenAPI规范
  endpoints?: APIEndpoint[]
  comInterface?: COMInterfaceSpec
  scripts?: SoftwareScript[]
  documentation?: string
  examples?: any[]
  compatibility?: CompatibilityInfo
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SoftwareScript {
  id: string
  softwareId: string
  version: string // 'common' 或具体版本号
  name: string
  description: string
  category: ScriptCategory
  language: ScriptLanguage
  code: string
  parameters?: Parameter[]
  versionTag: string
  compatibility?: string[]
  categoryTags?: string[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface UserSoftware {
  id: string
  userId: string
  softwareId: string
  apiKey?: string
  apiVersion?: string
  installationPath?: string
  version?: string
  settings?: any
  status: UserSoftwareStatus
  connectedAt?: string
  lastPing?: string
  lastDetected?: string
  createdAt: string
  updatedAt: string
  software?: Software
}

export interface VersionDetectionResult {
  softwareId: string
  detectedVersion: string
  installedPath: string
  platform: string
  architecture: string
  lastDetected: Date
  apiCompatibility: {
    isCompatible: boolean
    recommendedApiVersion: string
    requiredUpdates: string[]
    deprecatedFeatures: string[];
  }
}

export interface FixFile {
  filename: string
  content: string
  size: number
  lastModified: Date
}

export interface CompatibilityReport {
  software: {
    id: string
    name: string
    category: string
    vendor: string
  }
  version: string
  apiCompatibility: CompatibilityInfo
  scripts: Array<{
    id: string
    name: string
    version: string
    compatibility: string[]
  }>
  hasApiSupport: boolean
  hasScripts: boolean
}

// API接口相关类型
export interface APIEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  description: string
  parameters: Parameter[]
  responses: Response[]
  authentication?: boolean
}

export interface Parameter {
  name: string
  type: string
  required: boolean
  description: string
  defaultValue?: any
  validation?: ValidationRule
}

export interface Response {
  statusCode: number
  description: string
  schema?: any
  examples?: any[]
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  enum?: any[]
}

// COM接口相关类型
export interface COMInterfaceSpec {
  clsid: string
  progId: string
  interface: string
  methods: COMMethod[]
  properties: COMProperty[]
  events: COMEvent[]
}

export interface COMMethod {
  name: string
  parameters: Parameter[]
  returnType: string
  description: string
}

export interface COMProperty {
  name: string
  type: string
  readOnly: boolean
  description: string
}

export interface COMEvent {
  name: string
  parameters: Parameter[]
  description: string
}

// 兼容性信息
export interface CompatibilityInfo {
  minVersion: string
  maxVersion: string
  platforms: string[]
  dependencies: string[]
  conflicts: string[]
}

// 枚举类型
export enum ScriptCategory {
  AUTOMATION = 'automation',
  INTEGRATION = 'integration',
  UTILITY = 'utility',
  FIX = 'fix'
}

export enum ScriptLanguage {
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  APPLESCRIPT = 'applescript',
  VB = 'vb'
}

export enum UserSoftwareStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  BUSY = 'busy',
  ERROR = 'error'
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message: string
}

// 批量检测结果
export interface BatchDetectionResult {
  softwareId: string
  success: boolean
  data?: VersionDetectionResult
  error?: string
}

// 版本检测配置
export interface VersionDetectionConfig {
  registryPath?: string
  executableName: string
  macBundlePath?: string
}

// 软件检测配置
export interface SoftwareDetectionConfig {
  id: string
  name: string
  category: string
  vendor: string
  platforms: string[]
  officialApi: string
  autoDetection: boolean
  versionDetection: VersionDetectionConfig
}

// API请求参数
export interface DetectVersionRequest {
  softwareId: string
  userId: string
}

export interface GetApiSpecRequest {
  softwareId: string
  version?: string
  userId: string
}

export interface GetFixFilesRequest {
  softwareId: string
  version: string
  userId: string
}

export interface UploadScriptRequest {
  softwareId: string
  version?: string
  name: string
  description: string
  category: ScriptCategory
  language: ScriptLanguage
  code: string
  parameters?: Parameter[]
  compatibility?: string[]
  categoryTags?: string[]
}

// 错误类型
export interface ApiError {
  code: string
  message: string
  details?: any
}

// 分页相关
export interface PaginationParams {
  page: number
  limit: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 搜索和过滤
export interface SoftwareFilter {
  category?: string
  vendor?: string
  platform?: string
  status?: UserSoftwareStatus
  hasUpdates?: boolean
}

export interface SortOption {
  field: string
  label: string
}

// 导出这些类型
export type {
  Software as SoftwareType,
  SoftwareVersion as SoftwareVersionType,
  SoftwareApi as SoftwareApiType,
  SoftwareScript as SoftwareScriptType,
  UserSoftware as UserSoftwareType
}