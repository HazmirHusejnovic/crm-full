const onSubmit = async (values: NewChatFormValues) => {
  if (!session?.user?.id) {
    toast.error('User not authenticated.');
    return;
  }

  try {
    const { data: newChatData, error: chatError } = await supabase
      .from('chats')
      .insert({ 
        type: 'private',
        name: values.name || null,
        created_by: session.user.id, // This must match your column name
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (chatError) throw chatError;

    // Rest of your logic...
  } catch (error) {
    console.error('Chat creation error:', error);
    toast.error('Failed to create chat');
  }
};