fetch('https://text.pollinations.ai/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ]
  })
})
.then(response => response.text())
.then(data => console.log('Response:', data))
.catch(error => console.error('Error:', error));
