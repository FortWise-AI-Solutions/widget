import React, { useState } from 'react';
import { ChatWidget } from './components/ChatWidget';
import { ChatWidgetConfig, Theme } from './types';
import './styles/widget.css';

function App() {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('light');
  const [selectedPosition, setSelectedPosition] = useState<'left' | 'right'>('right');

  // const config: ChatWidgetConfig = {
  //   key: 'client',
  //   botId: '12',
  //   webhook: {
  //     url: 'https://7e97a968eea5.ngrok-free.app',
  //     route: 'webhooks/web'
  //   },
  //   style: {
  //     theme: selectedTheme,
  //     position: selectedPosition
  //   },
  //   features: {
  //     autoOpen: false,
  //     showTypingIndicator: true,
  //     enableNotifications: true,
  //     lazyLoad: false,
  //   },
  //   messages: {
  //     greeting: `Привет! Чем я могу помочь?`,
  //     placeholder: 'Напишите ваш вопрос...',
  //     errorMessage: 'Ошибка при подключении. Пожалуйста, попробуйте еще раз.',
  //     typingTimeoutMessage: 'Длительный ответ. Пожалуйста, попробуйте еще раз...'
  //   },
  //   socials: {
  //     instagram: 'https://www.instagram.com',
  //     facebook: 'https://www.facebook.com',
  //     telegram: 'https://www.telegram.com',
  //     whatsapp: 'https://www.whatsapp.com'
  //   }
  // };

  return (
    <div className={`min-h-screen transition-colors duration-300 p-8 ${
      selectedTheme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className={`rounded-xl shadow-lg p-8 mb-8 ${
          selectedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h1 className="text-3xl font-bold mb-4">React Chat Widget</h1>
          <p className="mb-6 opacity-80">
            Universal chat widget with theme support. Test different configurations below.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Theme</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTheme('light')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedTheme === 'light' 
                      ? 'bg-blue-500 text-white' 
                      : selectedTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => setSelectedTheme('dark')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedTheme === 'dark' 
                      ? 'bg-purple-500 text-white' 
                      : selectedTheme === 'light' 
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Position</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPosition('left')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedPosition === 'left' 
                      ? 'bg-blue-500 text-white' 
                      : selectedTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Left
                </button>
                <button
                  onClick={() => setSelectedPosition('right')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedPosition === 'right' 
                      ? 'bg-blue-500 text-white' 
                      : selectedTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Right
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Integration Code</h3>
            <div className={`p-4 rounded-lg font-mono text-sm ${
              selectedTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
            }`}>
              <div className="mb-2">
                <span className="opacity-60">// Configuration</span>
              </div>
              <div className="mb-2">
                <span className="text-blue-500">window</span>.ChatWidgetConfig = &#123;
              </div>
              <div className="ml-4 mb-2">
                style: &#123; theme: '<span className="text-green-500">{selectedTheme}</span>', position: '<span className="text-green-500">{selectedPosition}</span>' &#125;,
              </div>
              <div className="ml-4 mb-2">
                webhook: &#123; url: '<span className="text-green-500">https://your-api.com/chat</span>' &#125;
              </div>
              <div className="mb-4">&#125;;</div>
              
              <div className="mb-2">
                <span className="opacity-60">// Load widget</span>
              </div>
              <div>
                &lt;<span className="text-red-500">script</span> <span className="text-blue-500">defer</span> <span className="text-blue-500">src</span>=<span className="text-green-500">"https://your-cdn.com/loader.js"</span> <span className="text-blue-500">data-key</span>=<span className="text-green-500">"your-key"</span>&gt;&lt;/<span className="text-red-500">script</span>&gt;
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {['Responsive Design', 'Theme Support', 'CDN Ready', 'API Integration', 'TypeScript', 'Zero Dependencies'].map((feature, i) => (
              <div key={i} className={`p-4 rounded-lg ${
                selectedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="font-semibold">{feature}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* <ChatWidget config={config} /> */}
    </div>
  );
}

export default App;