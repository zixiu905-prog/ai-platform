#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running pre-commit checks...');

// 检查是否有暂存的文件
try {
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.length > 0);

  const hasTsFiles = stagedFiles.some(file => file.endsWith('.ts'));
  const hasJsFiles = stagedFiles.some(file => file.endsWith('.js'));

  if (!hasTsFiles && !hasJsFiles) {
    console.log('✅ No TypeScript/JavaScript files to check');
    process.exit(0);
  }

  console.log(`📁 Staged files: ${stagedFiles.length}`);

  // 1. 类型检查
  console.log('🔍 Running type check...');
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    console.log('✅ Type check passed');
  } catch (error) {
    console.error('❌ Type check failed');
    process.exit(1);
  }

  // 2. Linting
  console.log('🔍 Running linter...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ Linting passed');
  } catch (error) {
    console.error('❌ Linting failed');
    process.exit(1);
  }

  // 3. 单元测试
  console.log('🧪 Running unit tests...');
  try {
    execSync('npm run test:unit', { stdio: 'inherit' });
    console.log('✅ Unit tests passed');
  } catch (error) {
    console.error('❌ Unit tests failed');
    process.exit(1);
  }

  // 4. 检查测试覆盖率
  console.log('📊 Checking test coverage...');
  try {
    execSync('npm run test:coverage', { stdio: 'inherit' });
    
    // 读取覆盖率报告
    const coverageReport = JSON.parse(
      require('fs').readFileSync('./coverage/coverage-final.json', 'utf8')
    );
    
    let totalLines = 0;
    let coveredLines = 0;
    
    Object.values(coverageReport).forEach(file => {
      if (file.l) {
        totalLines += Object.keys(file.l).length;
        coveredLines += Object.values(file.l).filter(line => line > 0).length;
      }
    });
    
    const coverage = totalLines > 0 ? (coveredLines / totalLines * 100) : 0;
    
    if (coverage >= 70) {
      console.log(`✅ Test coverage: ${coverage.toFixed(2)}%`);
    } else if (coverage >= 50) {
      console.log(`⚠️ Test coverage: ${coverage.toFixed(2)}% (recommended: >=70%)`);
    } else {
      console.log(`❌ Test coverage too low: ${coverage.toFixed(2)}% (required: >=50%)`);
      process.exit(1);
    }
  } catch (error) {
    console.warn('⚠️ Could not check coverage (report not found)');
  }

  console.log('✅ All pre-commit checks passed!');
  console.log('🎉 Ready to commit!');
} catch (error) {
  console.error('❌ Pre-commit checks failed');
  process.exit(1);
}