import CrudResourcePage from '../features/shared/CrudResourcePage';
import { configs } from '../features/shared/crudConfigs';

export default function CategoriesPage() {
  return <CrudResourcePage config={configs.categories} />;
}
