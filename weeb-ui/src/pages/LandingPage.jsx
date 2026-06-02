import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-outfit font-bold text-text-title mb-6">
          Atur Uang Tanpa <span className="text-primary-500 shadow-glow-primary">Stres</span>
        </h1>
        <p className="text-lg text-text-body mb-10">
          WeeB adalah teman finansial cerdas yang mengerti kebutuhanmu. 
          Catat pengeluaran, atur budget, dan rencanakan masa depan dengan tenang.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/dashboard">
            <Button size="lg">Mulai Sekarang</Button>
          </Link>
          <Button size="lg" variant="secondary">Pelajari Lebih Lanjut</Button>
        </div>
      </div>
    </div>
  );
}
