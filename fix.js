const fs = require('fs');

const replaces = [
  { file: 'frontend/src/components/ui/CustomLink.jsx', from: /bg-white\/10 text-white shadow-lg shadow-primary-500\/20/g, to: 'bg-surface-200 text-surface-900 shadow-lg shadow-primary-500/20' },
  { file: 'frontend/src/components/ui/CustomLink.jsx', from: /hover:text-white hover:bg-white\/5/g, to: 'hover:text-surface-900 hover:bg-surface-200' },
  { file: 'frontend/src/components/targets/scanProgressPanel/PipelineNode.jsx', from: /isActive \? "text-white"/g, to: 'isActive ? "text-surface-900"' },
  { file: 'frontend/src/components/targets/targetDetails/TabSwitcher.jsx', from: /group-hover:text-white/g, to: 'group-hover:text-surface-900' },
  { file: 'frontend/src/components/targets/targetDetails/TabSwitcher.jsx', from: /\? "text-white"/g, to: '? "text-surface-900"' },
  { file: 'frontend/src/components/targets/newTarget/TargetAndRepoURLs/Target&RepoURLs.jsx', from: /\? "text-red-400" : "text-white"/g, to: '? "text-red-600" : "text-surface-900"' },
  { file: 'frontend/src/components/targets/newTarget/TargetAndRepoURLs/Target&RepoURLs.jsx', from: /hover:text-white hover:bg-white\/5/g, to: 'hover:text-surface-900 hover:bg-surface-200' },
  { file: 'frontend/src/components/targets/newTarget/Authentication/AuthTest.jsx', from: /bg-black\/20 border border-white\/10 text-white/g, to: 'bg-surface-100 border border-surface-300 text-surface-900' },
  { file: 'frontend/src/components/targets/targetDetails/compare/ComparePanel.jsx', from: /hover:text-white hover:bg-white\/10/g, to: 'hover:text-surface-900 hover:bg-surface-200' },
  { file: 'frontend/src/components/targets/targetDetails/compare/ComparePanel.jsx', from: /: "text-white"/g, to: ': "text-surface-900"' },
  { file: 'frontend/src/components/targets/newTarget/TargetAndRepoURLs/GitHubRepoDropdown.jsx', from: /bg-primary-600\/20 text-white/g, to: 'bg-primary-100 text-surface-900' },
  { file: 'frontend/src/components/targets/newTarget/TargetAndRepoURLs/GitHubRepoDropdown.jsx', from: /text-gray-300 hover:text-white/g, to: 'text-surface-600 hover:text-surface-900' },
  { file: 'frontend/src/pages/TargetDetails.jsx', from: /animate-spin text-white/g, to: 'animate-spin text-surface-900' }
];

replaces.forEach(r => {
  const p = `/data/WebPatcher/${r.file}`;
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(r.from, r.to);
    fs.writeFileSync(p, content);
  }
});
