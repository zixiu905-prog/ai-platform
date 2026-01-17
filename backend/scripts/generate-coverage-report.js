#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取覆盖率报告
const coveragePath = path.join(__dirname, '../coverage/coverage-final.json');
if (!fs.existsSync(coveragePath)) {
  console.log('Coverage report not found. Run tests with coverage first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

// 生成报告
function generateReport() {
  const total = {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0,
    coveredStatements: 0,
    coveredBranches: 0,
    coveredFunctions: 0,
    coveredLines: 0,
  };

  Object.values(coverage).forEach(fileCoverage => {
    if (fileCoverage.s) {
      Object.values(fileCoverage.s).forEach(stmt => {
        total.statements++;
        if (stmt > 0) total.coveredStatements++;
      });
    }

    if (fileCoverage.b) {
      Object.values(fileCoverage.b).forEach(branch => {
        total.branches++;
        if (branch > 0) total.coveredBranches++;
      });
    }

    if (fileCoverage.f) {
      Object.values(fileCoverage.f).forEach(fn => {
        total.functions++;
        if (fn > 0) total.coveredFunctions++;
      });
    }

    if (fileCoverage.l) {
      Object.values(fileCoverage.l).forEach(line => {
        total.lines++;
        if (line > 0) total.coveredLines++;
      });
    }
  });

  const report = {
    summary: {
      statements: {
        total: total.statements,
        covered: total.coveredStatements,
        percentage: total.statements > 0 ? (total.coveredStatements / total.statements * 100).toFixed(2) : 0
      },
      branches: {
        total: total.branches,
        covered: total.coveredBranches,
        percentage: total.branches > 0 ? (total.coveredBranches / total.branches * 100).toFixed(2) : 0
      },
      functions: {
        total: total.functions,
        covered: total.coveredFunctions,
        percentage: total.functions > 0 ? (total.coveredFunctions / total.functions * 100).toFixed(2) : 0
      },
      lines: {
        total: total.lines,
        covered: total.coveredLines,
        percentage: total.lines > 0 ? (total.coveredLines / total.lines * 100).toFixed(2) : 0
      }
    },
    timestamp: new Date().toISOString(),
    files: Object.keys(coverage).length
  };

  // 写入JSON报告
  const reportPath = path.join(__dirname, '../coverage/test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // 生成Markdown报告
  const markdown = `# 测试覆盖率报告

## 📊 总体覆盖率

| 指标 | 覆盖数 | 总数 | 百分比 |
|------|--------|------|--------|
| 语句 | ${report.summary.statements.covered} | ${report.summary.statements.total} | ${report.summary.statements.percentage}% |
| 分支 | ${report.summary.branches.covered} | ${report.summary.branches.total} | ${report.summary.branches.percentage}% |
| 函数 | ${report.summary.functions.covered} | ${report.summary.functions.total} | ${report.summary.functions.percentage}% |
| 行数 | ${report.summary.lines.covered} | ${report.summary.lines.total} | ${report.summary.lines.percentage}% |

## 📈 覆盖率状态

${getCoverageStatus(report.summary.lines.percentage)}

## 📁 文件覆盖详情

${getFileCoverageDetails(coverage)}

---

*报告生成时间: ${report.timestamp}*
`;

  const markdownPath = path.join(__dirname, '../coverage/COVERAGE_REPORT.md');
  fs.writeFileSync(markdownPath, markdown);

  console.log('Coverage report generated successfully!');
  console.log(`- Overall coverage: ${report.summary.lines.percentage}%`);
  console.log(`- JSON report: ${reportPath}`);
  console.log(`- Markdown report: ${markdownPath}`);
}

function getCoverageStatus(percentage) {
  const p = parseFloat(percentage);
  if (p >= 80) return '✅ **优秀** - 覆盖率达到要求';
  if (p >= 60) return '⚠️ **良好** - 建议提高覆盖率';
  return '❌ **需要改进** - 覆盖率过低';
}

function getFileCoverageDetails(coverage) {
  const files = Object.entries(coverage)
    .map(([file, data]) => {
      const lines = data.l ? Object.values(data.l).filter(l => l > 0).length : 0;
      const totalLines = data.l ? Object.keys(data.l).length : 0;
      const percentage = totalLines > 0 ? (lines / totalLines * 100).toFixed(2) : '0.00';
      
      return {
        file: file.replace(process.cwd(), ''),
        coverage: `${percentage}%`
      };
    })
    .sort((a, b) => parseFloat(b.coverage) - parseFloat(a.coverage))
    .slice(0, 10); // 只显示前10个文件

  if (files.length === 0) return '';

  const header = '| 文件 | 覆盖率 |\n|------|---------|\\n';
  const rows = files.map(({ file, coverage }) => `| ${file} | ${coverage} |`).join('\\n');
  
  return header + rows;
}

generateReport();