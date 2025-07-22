// ... existing imports ...

const NewChatForm: React.FC<NewChatFormProps> = ({ onSuccess }) => {
  // ... existing state and hooks ...

  const onSubmit = async (values: NewChatFormValues) => {
    console.log('--- NewChatForm onSubmit started ---');
    
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      console.error('User not authenticated. Session or user ID is missing.');
      return;
    }

    try {
      // ... existing chat creation logic ...

      // Create the new chat with RLS-compliant data
      const { data: newChatData, error: chatError } = await supabase
        .from('chats')
        .insert({ 
          type: 'private', 
          name: null,
          created_by: session.user.id // Include creator ID for RLS
        })
        .select('id')
        .single();

      if (chatError) {
        console.error('Supabase insert error for chats:', chatError);
        toast.error('Failed to create chat: ' + chatError.message);
        console.error('--- NewChatForm onSubmit failed (chat creation) ---');
        return;
      }

      // ... rest of the success logic ...

    } catch (error: any) {
      console.error('Unexpected error during chat creation:', error);
      toast.error('An unexpected error occurred: ' + error.message);
      console.error('--- NewChatForm onSubmit finished (unexpected error) ---');
    }
  };

  // ... rest of the component ...
};