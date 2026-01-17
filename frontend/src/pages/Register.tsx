import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock, User, Check } from 'lucide-react'
import { useAuthActions } from '@/hooks/useAuth'
import { validateEmail, validateUsername, validatePasswordStrength } from '@/utils/validation'

export default function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { register, isLoading, error, clearError } = useAuthActions()

  const getPasswordStrength = (password: string) => {
    const validation = validatePasswordStrength(password)
    return validation.isValid ? (validation.errors.length === 0 ? 5 : 3) : validation.errors.length
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const newData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    }
    setFormData(newData)
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // 验证用户名
    const usernameValidation = validateUsername(formData.username)
    if (!formData.username) {
      newErrors.username = '用户名不能为空'
    } else if (!usernameValidation.isValid) {
      newErrors.username = usernameValidation.errors.join(', ')
    }
    
    // 验证邮箱
    if (!formData.email) {
      newErrors.email = '邮箱不能为空'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }
    
    // 验证密码
    const passwordValidation = validatePasswordStrength(formData.password)
    if (!formData.password) {
      newErrors.password = '密码不能为空'
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors.join(', ')
    }
    
    // 验证确认密码
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次密码输入不一致'
    }
    
    // 验证服务条款
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = '请同意服务条款和隐私政策'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return { text: '弱', color: 'text-red-500' }
    if (strength === 3) return { text: '中等', color: 'text-yellow-500' }
    if (strength >= 4) return { text: '强', color: 'text-green-500' }
    return { text: '', color: 'text-gray-500' }
  }

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return 'bg-red-500'
    if (strength === 3) return 'bg-yellow-500'
    if (strength >= 4) return 'bg-green-500'
    return 'bg-gray-300'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    if (!validateForm()) {
      return
    }
    
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      })
      
      // 注册成功后跳转到仪表板
      navigate('/dashboard')
    } catch (error) {
      // 错误已经在useAuthActions中处理
      console.error('注册失败:', error)
    }
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const strengthText = getPasswordStrengthText(passwordStrength)
  const strengthColor = getPasswordStrengthColor(passwordStrength)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">注册</CardTitle>
            <CardDescription className="text-center">
              创建您的 AiDesign 账户，开启智能设计之旅
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 用户名 */}
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`pl-10 ${errors.username ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>

              {/* 邮箱 */}
              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* 密码 */}
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* 密码强度指示器 */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">密码强度</span>
                      <span className={`text-sm font-medium ${strengthText.color}`}>
                        {strengthText.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${strengthColor}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* 确认密码 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* 密码匹配提示 */}
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* 服务条款 */}
              <div className={`flex items-start space-x-2 p-3 bg-gray-50 rounded ${errors.agreeTerms ? 'border border-red-500' : ''}`}>
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="agreeTerms" className="text-sm leading-none">
                  我已阅读并同意
                  <a href="/terms" className="text-primary hover:underline ml-1">
                    服务条款
                  </a>
                  和
                  <a href="/privacy" className="text-primary hover:underline ml-1">
                    隐私政策
                  </a>
                </Label>
              </div>
              {errors.agreeTerms && (
                <p className="text-sm text-red-500">{errors.agreeTerms}</p>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 注册按钮 */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-t-2 border-l-2 border-white mr-2"></div>
                    注册中...
                  </div>
                ) : (
                  '创建账户'
                )}
              </Button>
            </form>

            {/* 登录链接 */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">已有账户？</span>
              <a href="/login" className="text-primary hover:underline ml-1">
                立即登录
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}