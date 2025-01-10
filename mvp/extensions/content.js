function createSidePanel() {
  const existingPanel = document.getElementById("extension-side-panel");
  if (existingPanel) {
    existingPanel.remove();
    document.body.style.width = "100%";
    document.body.style.float = "none";
    return;
  }

  document.body.style.width = "66.66%";
  document.body.style.float = "left";

  const sidePanel = document.createElement("div");
  sidePanel.id = "extension-side-panel";
  sidePanel.style.width = "400px";
  sidePanel.style.height = "100vh";
  sidePanel.style.position = "fixed";
  sidePanel.style.top = "0";
  sidePanel.style.right = "0";
  sidePanel.style.backgroundColor = "white";
  sidePanel.style.boxShadow = "-2px 0 5px rgba(0,0,0,0.2)";

  const currentUrl = encodeURIComponent(window.location.href);
  fetch(`http://localhost:8000/link/${currentUrl}`)
    .then((response) => response.json())
    .then((data) => {
      const responseDiv = document.createElement("div");
      responseDiv.style.padding = "20px";
      responseDiv.innerHTML = `
        <p>backend resp</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
      sidePanel.appendChild(responseDiv);
    })
    .catch((error) => {
      const errorDiv = document.createElement("div");
      errorDiv.style.padding = "20px";
      errorDiv.style.color = "red";
      errorDiv.innerHTML = `
        <h3>Error:</h3>
        <pre>${error.message}</pre>
      `;
      sidePanel.appendChild(errorDiv);
    });

  const clientId = "user_" + Math.random().toString(36).substr(2, 9);
  const ws = new WebSocket(`ws://localhost:8000/ws/${clientId}/${currentUrl}`);

  const chatContainer = document.createElement("div");
  chatContainer.style.padding = "20px";
  chatContainer.innerHTML = `
    <div id="chat-messages" style="height: 300px; overflow-y: auto; border: 1px solid #ccc; margin-bottom: 10px;"></div>
    <div style="display: flex; gap: 5px;">
      <input type="text" id="chat-input" style="width: 80%; padding: 5px; z-index: 10000;">
      <button id="chat-send-button" style="width: 18%; padding: 5px; z-index: 10000;">send</button>
    </div>
  `;
  sidePanel.appendChild(chatContainer);

  const messagesDiv = sidePanel.querySelector("#chat-messages");
  const chatInput = sidePanel.querySelector("#chat-input");
  const sendButton = sidePanel.querySelector("#chat-send-button");

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "chat_start":
        messagesDiv.innerHTML += `<p>${data.message}</p>`;
        break;
      case "chat_message":
        messagesDiv.innerHTML += `<p><strong>${data.sender}:</strong> ${data.message}</p>`;
        break;
      case "user_left":
        messagesDiv.innerHTML += `<p>${data.message}</p>`;
        break;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  sendButton.onclick = () => {
    if (chatInput.value.trim()) {
      ws.send(chatInput.value);
      messagesDiv.innerHTML += `<p>s${chatInput.value}</p>`;
      chatInput.value = "";
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  };

  chatInput.onkeypress = (e) => {
    if (e.key === "Enter") {
      sendButton.click();
    }
  };

  document.body.parentNode.appendChild(sidePanel);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "togglePanel") {
    createSidePanel();
  }
});
