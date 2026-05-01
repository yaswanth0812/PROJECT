fetch('https://text.pollinations.ai/?jsonMode=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        messages: [{ role: 'system', content: 'Return JSON with {"score": 10}' }],
        jsonMode: true
    })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
