import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ChatBubble from '../chat/ChatBubble';
import ChatWindow from '../chat/ChatWindow';

function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <ChatBubble />
      <ChatWindow />
    </div>
  );
}

export default Layout;
