import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
// ... other imports ...

interface NewChatFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (chatId: string) => void;
}

// Your component implementation
const NewChatForm = ({ isOpen, onClose, onSuccess }: NewChatFormProps) => {
  // ... component logic ...
  
  return (
    // ... your JSX ...
  );
};

// Add this line for default export
export default NewChatForm;

// Keep named export if needed elsewhere
export { NewChatForm };