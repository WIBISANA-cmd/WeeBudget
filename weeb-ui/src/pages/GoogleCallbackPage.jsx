import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import { apiGet, apiPost } from '../api/http';

export default function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrap = async () => {
      const code = params.get('code');
      if (!code) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const exchangeResponse = await apiPost('/auth/google/exchange', { code });
        const token = exchangeResponse.data?.token;
        if (!token) throw new Error('No token received');

        localStorage.setItem('weeb_auth_token', token);

        const response = await apiGet('/onboarding');
        const completed = Boolean(response.data?.completed);
        navigate(completed ? '/dashboard' : '/onboarding', { replace: true });
      } catch {
        navigate('/login', { replace: true });
      }
    };

    queueMicrotask(() => {
      bootstrap();
    });
  }, [navigate, params]);

  return <LoadingSkeleton rows={4} />;
}
