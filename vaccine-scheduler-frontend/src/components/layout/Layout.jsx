import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getActiveAds } from '../../api/advertisements';
import Header from './Header';
import Footer from './Footer';
import AdBanner from '../ads/AdBanner';
import ChatBubble from '../chat/ChatBubble';
import ChatWindow from '../chat/ChatWindow';
import GuidedTour from '../tour/GuidedTour';

function Layout() {
  const { hasAiChat, hasNoAds, isLoading } = useAuth();
  const [ads, setAds] = useState([]);

  useEffect(() => {
    if (isLoading) return;
    if (!hasNoAds) {
      getActiveAds()
        .then(setAds)
        .catch(() => setAds([]));
    }
  }, [isLoading, hasNoAds]);

  return (
    <div className="app-layout">
      <Header />
      {!hasNoAds && <AdBanner ads={ads} position="top" />}
      <div className="layout-body">
        {!hasNoAds && <AdBanner ads={ads} position="left" />}
        <main className="main-content">
          <Outlet />
        </main>
        {!hasNoAds && <AdBanner ads={ads} position="right" />}
      </div>
      {!hasNoAds && <AdBanner ads={ads} position="bottom" />}
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
