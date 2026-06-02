import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useCategoryOptions } from '../hooks/useCategoryOptions';

export default function BudgetsPage() {
  return <CrudResourcePage config={configs.budgets} options={useCategoryOptions()} />;
}
