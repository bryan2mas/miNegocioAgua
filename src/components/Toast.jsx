import { toast } from 'sonner';

// Wrapper para mantener la compatibilidad con el sistema anterior
export function notifyToast(message, type = 'info', duration = 3000, action = null) {
  const options = { duration };

  if (action) {
    options.action = {
      label: action.label,
      onClick: action.onClick,
    };
  }

  // Mapear tipos
  switch (type) {
    case 'error':
      toast.error(message, options);
      break;
    case 'success':
      toast.success(message, options);
      break;
    case 'warning':
      toast.warning(message, options);
      break;
    case 'info':
    default:
      toast.info(message, options);
      break;
  }
}


