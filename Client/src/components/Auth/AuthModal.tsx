'use client';

import React from 'react';
import { Modal } from 'antd';
import { useAuth } from '@/hooks';
import AuthLayout, { type AuthTab } from './AuthLayout';

/** Fullscreen auth modal — same screen as the /auth page, opened in place. */
const AuthModal: React.FC = () => {
   const { authModal, setAuthModal } = useAuth();
   const activeTab: AuthTab =
      authModal.activeTab === 'signup' ? 'signup' : 'signin';

   const close = () => setAuthModal({ isOpen: false, activeTab: 'signin' });

   return (
      <Modal
         open={authModal.isOpen}
         onCancel={close}
         footer={null}
         closable={false}
         centered={false}
         width="100vw"
         style={{ top: 0, maxWidth: '100vw', margin: 0, padding: 0 }}
         styles={{
            container: {
               height: '100dvh',
               padding: 0,
               borderRadius: 0,
               overflow: 'hidden',
            },
            body: { height: '100%' },
            mask: { backdropFilter: 'blur(8px)' },
         }}
      >
         <AuthLayout
            activeTab={activeTab}
            onSwitchTab={(tab) => setAuthModal({ isOpen: true, activeTab: tab })}
            onClose={close}
            setModalOpen={setAuthModal}
         />
      </Modal>
   );
};

export default AuthModal;
