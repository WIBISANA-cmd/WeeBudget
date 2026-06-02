import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useCategoryOptions } from '../hooks/useCategoryOptions';

export default function RecurringTransactionsPage() {
  return <CrudResourcePage config={configs.recurringTransactions} options={useCategoryOptions()} />;
}
