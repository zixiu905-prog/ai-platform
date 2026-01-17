import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Download,
  Sparkles,
  Zap,
  Shield,
  Users,
  Smartphone,
  Monitor,
  Github,
  Twitter,
  Mail,
  ArrowRight,
  CheckCircle,
  Palette,
  Workflow,
  Image
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AiDesign
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">登录</Button>
              </Link>
              <Link to="/register">
                <Button>注册</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI驱动的设计革命
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AiDesign 智能集成 Photoshop、AutoCAD 等专业设计软件，
            通过 AI 助手和自动化工作流，提升10倍设计效率
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/desktop/download">
              <Button size="lg" className="text-lg px-8 py-6">
                <Download className="mr-2 h-5 w-5" />
                免费下载桌面版
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <Monitor className="mr-2 h-5 w-5" />
                在线体验
              </Button>
            </Link>
          </div>

          {/* 下载选项 */}
          <div className="flex justify-center gap-4 mb-8">
            <Link to="/desktop/download">
              <Button variant="outline" size="sm">
                <Monitor className="mr-2 h-4 w-4" />
                Windows 版本
              </Button>
            </Link>
            <Link to="/desktop/download">
              <Button variant="outline" size="sm">
                <Monitor className="mr-2 h-4 w-4" />
                macOS 版本
              </Button>
            </Link>
            <Link to="/desktop/download">
              <Button variant="outline" size="sm">
                <Monitor className="mr-2 h-4 w-4" />
                Linux 版本
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            核心功能
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            集成最新 AI 技术，让设计工作更加高效智能
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI设计助手</h3>
              <p className="text-gray-600">
                智能对话助手，理解设计意图，快速生成设计建议和创意方案
              </p>
            </div>
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Image className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI图像生成</h3>
              <p className="text-gray-600">
                支持 DALL-E、Stable Diffusion 等多种 AI 模型，一键生成高质量图像
              </p>
            </div>
            <div className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Workflow className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">可视化工作流</h3>
              <p className="text-gray-600">
                拖拽式工作流编辑器，轻松创建自动化设计流程，提高工作效率
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 软件集成 */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            支持的设计软件
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            无缝集成主流设计软件，无需改变现有工作流程
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Adobe Photoshop</h3>
                <p className="text-sm text-gray-600 mb-4">图像处理与设计</p>
                <span className="inline-flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  已支持
                </span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">AutoCAD</h3>
                <p className="text-sm text-gray-600 mb-4">CAD 绘图与设计</p>
                <span className="inline-flex items-center text-sm text-blue-600">
                  <Zap className="h-4 w-4 mr-1" />
                  开发中
                </span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Illustrator</h3>
                <p className="text-sm text-gray-600 mb-4">矢量图形设计</p>
                <span className="inline-flex items-center text-sm text-gray-500">
                  计划中
                </span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Figma</h3>
                <p className="text-sm text-gray-600 mb-4">UI/UX 设计</p>
                <span className="inline-flex items-center text-sm text-gray-500">
                  计划中
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 优势特性 */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            为什么选择 AiDesign？
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            专为设计师打造的智能助手，让创意无限放大
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">极速响应</h3>
                <p className="text-gray-600">
                  本地化部署，毫秒级响应速度，无缝集成现有工作流
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">安全可靠</h3>
                <p className="text-gray-600">
                  数据加密存储，隐私保护，企业级安全保障
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">团队协作</h3>
                <p className="text-gray-600">
                  支持多人协作，共享工作流，提升团队整体效率
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">多端同步</h3>
                <p className="text-gray-600">
                  桌面端、网页端、移动端数据实时同步，随时随地创作
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            立即开始使用 AiDesign
          </h2>
          <p className="text-xl mb-8 opacity-90">
            免费下载，开启智能设计之旅
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/desktop/download">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                <Download className="mr-2 h-5 w-5" />
                下载桌面版
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 border-white text-white">
                注册账户
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-12 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="h-6 w-6" />
                <span className="text-xl font-bold">AiDesign</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI 驱动的设计平台，让创意无限放大
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">产品</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/desktop/download" className="hover:text-white">下载</Link></li>
                <li><Link to="/features" className="hover:text-white">功能</Link></li>
                <li><Link to="/pricing" className="hover:text-white">定价</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">支持</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/docs" className="hover:text-white">文档</Link></li>
                <li><Link to="/help" className="hover:text-white">帮助</Link></li>
                <li><Link to="/contact" className="hover:text-white">联系我们</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">关注我们</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 AiDesign. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
