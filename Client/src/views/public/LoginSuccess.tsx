import { apiLoginGoogleSuccess } from '@/apis';
import { signIn } from '@/contexts/auth/reduces';
import { useAuth } from '@/hooks';
import { path } from '@/utils/constant';

import React, { useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';

const LoginSuccess: React.FC = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { dispatch } = useAuth();
    useEffect(() => {
        const fetchUser = async () => {
            const response = await apiLoginGoogleSuccess({ userId: userId });
            if (response.success) {
                dispatch(signIn({ accessToken: response.data.accessToken, user: response.data.user }));
            }
            navigate(`/${path.HOME}`);
        };
        fetchUser();
    }, [navigate, dispatch, userId]);
    return (
        <div className="min-h-screen">
            <FullscreenLoader spinning />
        </div>
    );
};

export default LoginSuccess;
