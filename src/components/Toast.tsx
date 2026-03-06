import { Toast } from '@base-ui-components/react/toast';
import type { ToastObject } from '@base-ui-components/react/toast';

export const toastManager = Toast.createToastManager();

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return (
    <>
      {(toasts as ToastObject<object>[]).map((toast) => (
        <Toast.Root key={toast.id} toast={toast} className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          <Toast.Title />
        </Toast.Root>
      ))}
    </>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} timeout={3000}>
      {children}
      <Toast.Viewport className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        <ToastList />
      </Toast.Viewport>
    </Toast.Provider>
  );
}
