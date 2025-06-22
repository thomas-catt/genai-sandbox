import { useState, useEffect, use } from 'react';
import magicWand from "./assets/magic-wand.svg";
import './App.css';

const id = btoa((""+Math.random()).replace("0.", "")).substring(0, 20);

function App() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [sendWebpage, setSendWebpage] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const sendMesssage = async () => {
        if (inputValue.trim() === '') return;
        setIsLoading(true);
        setInputValue('');

        const newMessages = [
            ...messages,
            { role: 'user', content: inputValue, pageContext: sendWebpage }
        ];
        setMessages(newMessages);
        
        try {
            const response = await fetch('http://localhost:8080/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversationId: id,
                    pageBody: sendWebpage ? document.querySelector("html").outerHTML : null,
                    content: inputValue
                }),
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate response');
            }
            if (data.code) {
                const codeTarget = document.getElementById("__code-target");
                codeTarget.innerHTML = data.message;
                const scriptTags = codeTarget.querySelectorAll("script");
                for (const script of scriptTags) {
                    const newScript = document.createElement("script");
                    newScript.textContent = script.textContent;
                    document.body.appendChild(newScript);
                }
            }
            setMessages([
                ...newMessages,
                { role: 'assistant', content: data.message, code: data.code || false },
            ]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages([
                ...newMessages,
                { role: 'error', content: '<b>Error:</b> ' + (error.message || error) },
            ]);
        } finally {
            setIsLoading(false);
        }
    }
    
    useEffect(() => {
        console.log(id);
        
        const fetchMessages = async () => {
            try {
                const response = await fetch('http://localhost:8080/messages', {
                    method: 'GET',
                });
                const data = await response.json();
                if (!data.success)
                    throw new Error(data.message || 'Failed to fetch messages');
                setMessages(data.messages.map(m => {
                    if (m.role == 'assistant')
                        return {
                            role: m.role,
                            content: JSON.parse(
                                m.content
                                .replaceAll("\\", "")
                            ).message
                        };
                    return m
                }));
                
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };
        // fetchMessages();
    }, []);
    
    useEffect(() => {
        for (const word of ["this page", "this site"]) {
            if ((inputValue.includes(word))) {
                setSendWebpage(true);
                break;
            } else
                setSendWebpage(false);
        }
    }, [inputValue]);
    
    return (
        <div className="app">
            <div className="messages">
                {messages.map((message, index) => <>
                    <div key={index} className={`message ${message.role}`}>
                    {
                        message.code ? <div className="message-code">
                            <i><img src={magicWand} className='icon' />Your page was modified.</i>
                        </div> : 
                        <div className="message-content" dangerouslySetInnerHTML={{ __html: message.content }}></div>
                    }
                    {message.pageContext && <i className="message-page-context">Sent with page context</i>}
                    </div>
                </>)}
            </div>
            <div className="message-area">
                <div className='message-send-webpage'>
                    <input
                        type="checkbox"
                        id="send-webpage"
                        className="send-webpage-input"
                        checked={sendWebpage}
                        onChange={(e) => setSendWebpage(e.target.checked)}
                    />
                    <label
                        htmlFor="send-webpage"
                        className="send-webpage-label"
                    >
                        Send page context
                    </label>
                </div>
                <div className="message-box">
                    <input type="text" className="message-input"
                        value={inputValue}
                        disabled={isLoading}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && inputValue.trim() !== '')
                                sendMesssage();
                        }}
                        placeholder={isLoading ? "Thinking..." : "Type your message here"}
                    />
                    <button
                        className="send-button"
                        disabled={isLoading}
                        onClick={() => sendMesssage()}
                    >
                        Send
                    </button>
                </div>
            </div>
            <div id="__code-target"></div>
        </div>
    );
}

export default App;
