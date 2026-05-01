fetch('https://text.pollinations.ai/prompt/Hello')
    .then(r => r.text())
    .then(console.log)
    .catch(console.error);
