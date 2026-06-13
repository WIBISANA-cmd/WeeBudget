import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';
import { useAccountOptions } from '../hooks/useAccountOptions';

export default function CategoriesPage() {
  const accountOptions = useAccountOptions();

  return <CrudResourcePage config={configs.categories} options={accountOptions} />;
}
