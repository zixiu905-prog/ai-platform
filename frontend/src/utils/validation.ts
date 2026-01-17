// 验证工具函数

// 邮箱验证
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 密码强度验证
export const validatePasswordStrength = (password: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('密码长度至少8位')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母')
  }
  
  if (!/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 用户名验证
export const validateUsername = (username: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (username.length < 3) {
    errors.push('用户名长度至少3位')
  }
  
  if (username.length > 20) {
    errors.push('用户名长度不能超过20位')
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('用户名只能包含字母、数字、下划线和连字符')
  }
  
  if (/^[0-9]/.test(username)) {
    errors.push('用户名不能以数字开头')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 项目名称验证
export const validateProjectName = (name: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (!name.trim()) {
    errors.push('项目名称不能为空')
  }
  
  if (name.trim().length < 2) {
    errors.push('项目名称至少2个字符')
  }
  
  if (name.length > 50) {
    errors.push('项目名称不能超过50个字符')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// URL验证
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 手机号验证（中国大陆）
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 身份证号验证（中国大陆）
export const validateIdCard = (idCard: string): boolean => {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  return idCardRegex.test(idCard)
}

// 通用表单验证
export const validateField = (value: string, rules: {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: string) => string | null
}): string | null => {
  if (rules.required && !value.trim()) {
    return '此字段不能为空'
  }
  
  if (rules.minLength && value.length < rules.minLength) {
    return `最少需要${rules.minLength}个字符`
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    return `最多允许${rules.maxLength}个字符`
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    return '格式不正确'
  }
  
  if (rules.custom) {
    return rules.custom(value)
  }
  
  return null
}

// 文件验证
export const validateFile = (file: File, rules: {
  maxSize?: number // 字节
  allowedTypes?: string[]
}): string | null => {
  if (rules.maxSize && file.size > rules.maxSize) {
    const maxSizeMB = Math.round(rules.maxSize / 1024 / 1024 * 100) / 100
    return `文件大小不能超过${maxSizeMB}MB`
  }
  
  if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
    return `文件类型不支持，支持的类型：${rules.allowedTypes.join(', ')}`
  }
  
  return null
}