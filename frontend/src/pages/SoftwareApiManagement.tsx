import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  Settings,
  FileText,
  Code,
  Wrench,
  Search
} from 'lucide-react'
import axios from 'axios'

interface Software {
  id: string
  name: string
  category: string
  vendor: string
  platforms: string[]
  officialApi?: string
  description: string
  icon?: string
  features: string[]
}

interface SoftwareVersion {
  id: string
  version: string
  releaseDate: string
  apiVersion: string
  isLatest: boolean
  isSupported: boolean
  deprecationDate?: string
}

interface UserSoftware {
  id: string
  softwareId: string
  version?: string
  apiVersion?: string
  installationPath?: string
  status: string
  lastDetected?: string
  settings?: any
  software?: Software
}

interface VersionDetectionResult {
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

interface SoftwareApi {
  id: string
  softwareId: string
  version: string
  apiVersion: string
  apiSpec?: any
  endpoints: any[]
  comInterface?: any
  scripts: any[]
  documentation: string
  examples: any[]
  compatibility: any
}

interface FixFile {
  filename: string
  content: string
  size: number
  lastModified: Date
}

export const SoftwareApiManagement: React.FC = () => {
  const [softwareList, setSoftwareList] = useState<Software[]>([])
  const [userSoftwareList, setUserSoftwareList] = useState<UserSoftware[]>([])
  const [selectedSoftware, setSelectedSoftware] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState<string>('')
  const [detectionResults, setDetectionResults] = useState<Record<string, VersionDetectionResult>>({})
  const [apiSpecs, setApiSpecs] = useState<Record<string, SoftwareApi>>({})
  const [fixFiles, setFixFiles] = useState<Record<string, FixFile[]>>({})
  const [activeTab, setActiveTab] = useState('overview')

  // 获取支持的软件列表
  const fetchSupportedSoftware = async () => {
    try {
      const response = await axios.get('/api/software-api-management/supported')
      if (response.data.success) {
        setSoftwareList(response.data.data)
      }
    } catch (error) {
      console.error('获取支持的软件列表失败:', error)
    }
  }

  // 获取用户软件列表
  const fetchUserSoftware = async () => {
    try {
      const response = await axios.get('/api/software/list')
      if (response.data.success) {
        setUserSoftwareList(response.data.data)
      }
    } catch (error) {
      console.error('获取用户软件列表失败:', error)
    }
  }

  // 检测软件版本
  const detectVersion = async (softwareId: string) => {
    setDetecting(softwareId)
    try {
      const response = await axios.post(`/api/software-api-management/detect/${softwareId}`)
      if (response.data.success) {
        const result = response.data.data
        setDetectionResults(prev => ({
          ...prev,
          [softwareId]: result
        }))
        
        // 更新用户软件列表
        await fetchUserSoftware()
        
        // 自动获取API规范
        await fetchApiSpec(softwareId, result.detectedVersion)
        
        // 获取修复文件
        await fetchFixFiles(softwareId, result.detectedVersion)
      }
    } catch (error) {
      console.error('检测软件版本失败:', error)
    } finally {
      setDetecting('')
    }
  }

  // 批量检测所有软件
  const detectAllVersions = async () => {
    setLoading(true)
    try {
      const response = await axios.post('/api/software-api-management/detect-all')
      if (response.data.success) {
        const results = response.data.data
        const detectionMap: Record<string, VersionDetectionResult> = {}
        
        results.forEach((result: any) => {
          if (result.success) {
            detectionMap[result.softwareId] = result.data
          }
        })
        
        setDetectionResults(prev => ({ ...prev, ...detectionMap }))
        await fetchUserSoftware()
      }
    } catch (error) {
      console.error('批量检测失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取API规范
  const fetchApiSpec = async (softwareId: string, version?: string) => {
    try {
      const url = version 
        ? `/api/software-api-management/api/${softwareId}/${version}`
        : `/api/software-api-management/api/${softwareId}`
      
      const response = await axios.get(url)
      if (response.data.success) {
        setApiSpecs(prev => ({
          ...prev,
          [`${softwareId}_${version || 'default'}`]: response.data.data
        }))
      }
    } catch (error) {
      console.error('获取API规范失败:', error)
    }
  }

  // 获取修复文件
  const fetchFixFiles = async (softwareId: string, version: string) => {
    try {
      const response = await axios.get(`/api/software-api-management/fixes/${softwareId}/${version}`)
      if (response.data.success) {
        setFixFiles(prev => ({
          ...prev,
          [`${softwareId}_${version}`]: response.data.data
        }))
      }
    } catch (error) {
      console.error('获取修复文件失败:', error)
    }
  }

  // 下载修复文件
  const downloadFixFile = async (softwareId: string, version: string, filename: string) => {
    try {
      const response = await axios.get(`/api/software-api-management/fixes/${softwareId}/${version}/${filename}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载修复文件失败:', error)
    }
  }

  // 获取兼容性报告
  const getCompatibilityReport = async (softwareId: string, version: string) => {
    try {
      const response = await axios.get(`/api/software-api-management/compatibility/${softwareId}/${version}`)
      if (response.data.success) {
        return response.data.data
      }
    } catch (error) {
      console.error('获取兼容性报告失败:', error)
    }
  }

  useEffect(() => {
    fetchSupportedSoftware()
    fetchUserSoftware()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'busy':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (softwareId: string) => {
    const result = detectionResults[softwareId]
    const userSoftware = userSoftwareList.find(s => s.softwareId === softwareId)
    
    if (!userSoftware) {
      return <Badge variant="secondary">未连接</Badge>
    }
    
    if (result) {
      if (result.apiCompatibility.isCompatible) {
        return <Badge className="bg-green-500">兼容</Badge>
      } else {
        return <Badge variant="destructive">不兼容</Badge>
      }
    }
    
    return <Badge variant="outline">未知</Badge>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">软件API管理</h1>
          <p className="text-muted-foreground">管理设计软件API版本、兼容性和自动匹配</p>
        </div>
        <Button 
          onClick={detectAllVersions} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          批量检测版本
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="version-detection">版本检测</TabsTrigger>
          <TabsTrigger value="api-specs">API规范</TabsTrigger>
          <TabsTrigger value="fix-files">修复文件</TabsTrigger>
          <TabsTrigger value="compatibility">兼容性</TabsTrigger>
        </TabsList>

        {/* 总览页面 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {softwareList.map(software => {
              const userSoftware = userSoftwareList.find(s => s.softwareId === software.id)
              const detectionResult = detectionResults[software.id]
              
              return (
                <Card key={software.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{software.name}</CardTitle>
                      {getStatusBadge(software.id)}
                    </div>
                    <CardDescription>{software.vendor}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">状态:</span>
                      {userSoftware ? getStatusIcon(userSoftware.status) : <XCircle className="h-4 w-4 text-gray-400" />}
                      <span>{userSoftware?.status || '未连接'}</span>
                    </div>
                    
                    {userSoftware?.version && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">版本:</span>
                        <span>{userSoftware.version}</span>
                      </div>
                    )}
                    
                    {detectionResult && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">API兼容性:</span>
                          {detectionResult.apiCompatibility.isCompatible ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        
                        {!detectionResult.apiCompatibility.isCompatible && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {detectionResult.apiCompatibility.requiredUpdates.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => detectVersion(software.id)}
                        disabled={detecting === software.id}
                        className="flex items-center gap-1"
                      >
                        <Search className="h-3 w-3" />
                        {detecting === software.id ? '检测中...' : '检测版本'}
                      </Button>
                      
                      {userSoftware && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSoftware(software.id)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* 版本检测页面 */}
        <TabsContent value="version-detection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>版本检测结果</CardTitle>
              <CardDescription>查看和管理软件版本检测的结果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(detectionResults).map(([softwareId, result]) => {
                  const software = softwareList.find(s => s.id === softwareId)
                  return (
                    <div key={softwareId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{software?.name || softwareId}</h4>
                        <Badge variant={result.apiCompatibility.isCompatible ? 'default' : 'destructive'}>
                          {result.apiCompatibility.isCompatible ? '兼容' : '不兼容'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">检测版本:</span>
                          <span className="ml-2">{result.detectedVersion}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">安装路径:</span>
                          <span className="ml-2">{result.installedPath}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">平台:</span>
                          <span className="ml-2">{result.platform}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">架构:</span>
                          <span className="ml-2">{result.architecture}</span>
                        </div>
                      </div>
                      
                      {!result.apiCompatibility.isCompatible && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p><strong>需要的更新:</strong></p>
                              <ul className="list-disc list-inside text-sm">
                                {result.apiCompatibility.requiredUpdates.map((update, index) => (
                                  <li key={index}>{update}</li>
                                ))}
                              </ul>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )
                })}
                
                {Object.keys(detectionResults).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>暂无检测结果</p>
                    <p className="text-sm">点击"批量检测版本"或单个软件的"检测版本"开始</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API规范页面 */}
        <TabsContent value="api-specs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API规范文档</CardTitle>
              <CardDescription>查看各软件版本的API规范和接口文档</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(apiSpecs).map(([key, apiSpec]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{apiSpec.softwareId} v{apiSpec.version}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline">API {apiSpec.apiVersion}</Badge>
                        <Button variant="outline" size="sm">
                          <FileText className="h-3 w-3 mr-1" />
                          文档
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">端点数量:</span>
                        <span className="ml-2">{apiSpec.endpoints?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">脚本数量:</span>
                        <span className="ml-2">{apiSpec.scripts?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">示例数量:</span>
                        <span className="ml-2">{apiSpec.examples?.length || 0}</span>
                      </div>
                    </div>
                    
                    {apiSpec.documentation && (
                      <div className="bg-muted rounded p-3">
                        <p className="text-sm">{apiSpec.documentation}</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {Object.keys(apiSpecs).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-4" />
                    <p>暂无API规范</p>
                    <p className="text-sm">请先检测软件版本以获取对应的API规范</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 修复文件页面 */}
        <TabsContent value="fix-files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>修复文件管理</CardTitle>
              <CardDescription>下载和管理软件的修复文件和增强脚本</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(fixFiles).map(([key, files]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium">{key.replace('_', ' v')}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                          <div className="flex items-center gap-3">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{file.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const [softwareId, version] = key.split('_')
                              downloadFixFile(softwareId, version, file.filename)
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            下载
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {Object.keys(fixFiles).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4" />
                    <p>暂无修复文件</p>
                    <p className="text-sm">请先检测软件版本以获取对应的修复文件</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 兼容性页面 */}
        <TabsContent value="compatibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>兼容性检查</CardTitle>
              <CardDescription>查看软件版本兼容性详细报告</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userSoftwareList.map(userSoftware => {
                  const software = softwareList.find(s => s.id === userSoftware.softwareId)
                  const result = detectionResults[userSoftware.softwareId]
                  
                  if (!userSoftware.version) return null
                  
                  return (
                    <div key={userSoftware.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{software?.name || userSoftware.softwareId}</h4>
                        <Badge variant={result?.apiCompatibility.isCompatible ? 'default' : 'destructive'}>
                          {result?.apiCompatibility.isCompatible ? '兼容' : '不兼容'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">当前版本:</span>
                          <span className="ml-2">{userSoftware.version}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">API版本:</span>
                          <span className="ml-2">{userSoftware.apiVersion || '未知'}</span>
                        </div>
                      </div>
                      
                      {result && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">推荐API版本:</span>
                            <span className="text-sm">{result.apiCompatibility.recommendedApiVersion}</span>
                          </div>
                          
                          {result.apiCompatibility.deprecatedFeatures.length > 0 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <div>
                                  <p className="font-medium mb-1">已弃用功能:</p>
                                  <ul className="list-disc list-inside text-sm">
                                    {result.apiCompatibility.deprecatedFeatures.map((feature, index) => (
                                      <li key={index}>{feature}</li>
                                    ))}
                                  </ul>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {userSoftwareList.filter(s => s.version).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>暂无兼容性数据</p>
                    <p className="text-sm">请先检测软件版本以查看兼容性报告</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SoftwareApiManagement