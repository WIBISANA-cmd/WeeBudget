import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';

export default function BillsPage() {
  return <CrudResourcePage config={configs.bills} />;
}
