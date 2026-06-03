import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';

export default function UsersPage() {
  return <CrudResourcePage config={configs.users} />;
}
