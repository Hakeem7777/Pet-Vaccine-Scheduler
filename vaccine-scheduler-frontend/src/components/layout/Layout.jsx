import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from './Header';
import Footer from './Footer';
import ChatBubble from '../chat/ChatBubble';
import ChatWindow from '../chat/ChatWindow';
import GuidedTour from '../tour/GuidedTour';

function Layout() {
  const { hasAiChat } = useAuth();

  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      {hasAiChat && (
        <>
          <ChatBubble />
          <ChatWindow />
        </>
      )}
      <GuidedTour />
    </div>
  );
}

export default Layout;
