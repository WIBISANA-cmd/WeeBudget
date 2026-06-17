import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton';
import { apiGet } from '../api/http';

export default function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrap = async () => {
      const token = params.get('token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      localStorage.setItem('weeb_auth_token', token);

      try {
        const response = await apiGet('/onboarding');
        const completed = Boolean(response.data?.completed);
        navigate(completed ? '/dashboard' : '/onboarding', { replace: true });
      } catch {
        navigate('/onboarding', { replace: true });
      }
    };

    queueMicrotask(() => {
      bootstrap();
    });
  }, [navigate, params]);

  return <LoadingSkeleton rows={4} />;
}
