import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';

export default function AccountsPage() {
  return <CrudResourcePage config={configs.accounts} />;
}
