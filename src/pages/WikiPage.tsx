import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Search, BookOpen, FolderOpen, Eye } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import WikiCategoryForm from '@/components/WikiCategoryForm';
import WikiArticleForm from '@/components/WikiArticleForm';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '@/lib/api'; // Import novog API klijenta

interface WikiCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface WikiArticle {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  visibility: 'admin' | 'worker' | 'public';
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  creator_first_name: string | null;
  creator_last_name: string | null;
  updater_first_name: string | null;
  updater_last_name: string | null;
}

interface WikiArticleVersion {
  id: string;
  article_id: string;
  content: string;
  edited_by: string | null;
  edited_at: string;
  editor_profile: { first_name: string | null; last_name: string | null } | null;
}

const WikiPage: React.FC = () => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [articleVersions, setArticleVersions] = useState<WikiArticleVersion[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isArticleFormOpen, setIsArticleFormOpen] = useState(false);
  const [isArticleViewOpen, setIsArticleViewOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WikiCategory | undefined>(undefined);
  const [editingArticle, setEditingArticle] = useState<WikiArticle | undefined>(undefined);
  const [viewingArticle, setViewingArticle] = useState<WikiArticle | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data } = await api.get('/wiki-categories'); // Pretpostavljena ruta
      setCategories(data as WikiCategory[]);
    } catch (error: any) {
      toast.error('Failed to load wiki categories: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchArticles = async () => {
    setLoadingArticles(true);
    try {
      const params: any = {};
      if (searchTerm) {
        params.title = searchTerm;
      }
      if (filterCategoryId !== 'all') {
        params.category_id = filterCategoryId;
      }
      if (filterVisibility !== 'all') {
        params.visibility = filterVisibility;
      }
      const { data } = await api.get('/wiki-articles', { params }); // Pretpostavljena ruta
      setArticles(data as WikiArticle[]);
    } catch (error: any) {
      toast.error('Failed to load wiki articles: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingArticles(false);
    }
  };

  const fetchArticleVersions = async (articleId: string) => {
    setLoadingVersions(true);
    try {
      const { data } = await api.get(`/wiki-articles/${articleId}/versions`); // Pretpostavljena ruta
      setArticleVersions(data as WikiArticleVersion[]);
    } catch (error: any) {
      toast.error('Failed to load article versions: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingVersions(false);
    }
  };

  useEffect(() => {
    if (session) {
      const fetchUserRole = async () => {
        try {
          const { data } = await api.get(`/profiles/${session.user.id}`); // Pretpostavljena ruta
          setCurrentUserRole(data.role);
        } catch (error: any) {
          console.error('Error fetching user role:', error.response?.data || error.message);
          toast.error('Failed to fetch your user role.');
        }
      };
      fetchUserRole();
    }
    fetchCategories();
  }, [session]);

  useEffect(() => {
    fetchArticles();
  }, [searchTerm, filterCategoryId, filterVisibility, currentUserRole]);

  const handleNewCategoryClick = () => {
    setEditingCategory(undefined);
    setIsCategoryFormOpen(true);
  };

  const handleEditCategoryClick = (category: WikiCategory) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Articles linked to this category will have their category set to null.')) return;

    try {
      await api.delete(`/wiki-categories/${categoryId}`); // Pretpostavljena ruta
      toast.success('Category deleted successfully!');
      fetchCategories();
      fetchArticles();
    } catch (error: any) {
      toast.error('Failed to delete category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleNewArticleClick = () => {
    setEditingArticle(undefined);
    setIsArticleFormOpen(true);
  };

  const handleEditArticleClick = (article: WikiArticle) => {
    setEditingArticle(article);
    setIsArticleFormOpen(true);
  };

  const handleViewArticleClick = (article: WikiArticle) => {
    setViewingArticle(article);
    setIsArticleViewOpen(true);
  };

  const handleViewVersionHistory = (article: WikiArticle) => {
    setViewingArticle(article);
    fetchArticleVersions(article.id);
    setIsVersionHistoryOpen(true);
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!window.confirm('Are you sure you want to delete this article? This will also delete all its versions.')) return;

    try {
      await api.delete(`/wiki-articles/${articleId}`); // Pretpostavljena ruta
      toast.success('Article deleted successfully!');
      fetchArticles();
    } catch (error: any) {
      toast.error('Failed to delete article: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCategoryFormSuccess = () => {
    setIsCategoryFormOpen(false);
    fetchCategories();
  };

  const handleArticleFormSuccess = () => {
    setIsArticleFormOpen(false);
    fetchArticles();
  };

  const canManageWiki = currentUserRole === 'administrator';

  if (loadingCategories || loadingArticles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Wiki (Internal Knowledge Base)</h1>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">All Articles</h2>
            {canManageWiki && (
              <Dialog open={isArticleFormOpen} onOpenChange={setIsArticleFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewArticleClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Article
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>{editingArticle ? 'Edit Article' : 'Create New Article'}</DialogTitle>
                  </DialogHeader>
                  <WikiArticleForm initialData={editingArticle} onSuccess={handleArticleFormSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select onValueChange={setFilterCategoryId} defaultValue={filterCategoryId}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setFilterVisibility} defaultValue={filterVisibility}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">No articles found. Create one!</p>
            ) : (
              articles.map((article) => (
                <Card key={article.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {article.title}
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewArticleClick(article)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageWiki && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditArticleClick(article)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteArticle(article.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="text-xs text-gray-500 dark:text-gray-300">
                      <p>Category: <span className="font-medium">{article.category_name || 'N/A'}</span></p>
                      <p>Visibility: <span className="font-medium capitalize">{article.visibility}</span></p>
                      <p>Created By: <span className="font-medium">{article.creator_first_name} {article.creator_last_name}</span></p>
                      <p>Last Updated: <span className="font-medium">{article.updated_at ? format(new Date(article.updated_at), 'PPP p') : 'N/A'}</span></p>
                      {canManageWiki && (
                        <Button variant="link" size="sm" className="p-0 h-auto mt-2" onClick={() => handleViewVersionHistory(article)}>
                          View History
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Article View Dialog */}
          <Dialog open={isArticleViewOpen} onOpenChange={setIsArticleViewOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{viewingArticle?.title}</DialogTitle>
              </DialogHeader>
              <div className="prose dark:prose-invert max-w-none">
                {viewingArticle?.content && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {viewingArticle.content}
                  </ReactMarkdown>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-4 border-t pt-4">
                <p>Category: <span className="font-medium">{viewingArticle?.category_name || 'N/A'}</span></p>
                <p>Visibility: <span className="font-medium capitalize">{viewingArticle?.visibility}</span></p>
                <p>Created By: <span className="font-medium">{viewingArticle?.creator_first_name} {viewingArticle?.creator_last_name}</span></p>
                <p>Last Updated: <span className="font-medium">{viewingArticle?.updater_first_name} {viewingArticle?.updater_last_name} on {viewingArticle?.updated_at ? format(new Date(viewingArticle.updated_at), 'PPP p') : 'N/A'}</span></p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Version History Dialog */}
          <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Version History for "{viewingArticle?.title}"</DialogTitle>
              </DialogHeader>
              {loadingVersions ? (
                <LoadingSpinner size={32} className="min-h-[100px]" />
              ) : articleVersions.length === 0 ? (
                <p className="text-center text-gray-500">No version history found for this article.</p>
              ) : (
                <div className="space-y-4">
                  {articleVersions.map((version, idx) => (
                    <Card key={version.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Version {articleVersions.length - idx}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Edited by: {version.editor_profile?.first_name} {version.editor_profile?.last_name} on {format(new Date(version.edited_at), 'PPP p')}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="prose dark:prose-invert max-w-none max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/10">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {version.content}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Wiki Categories</h2>
            {canManageWiki && (
              <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewCategoryClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                  </DialogHeader>
                  <WikiCategoryForm initialData={editingCategory} onSuccess={handleCategoryFormSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">No categories found. Create one!</p>
            ) : (
              categories.map((category) => (
                <Card key={category.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {category.name}
                      {canManageWiki && (
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategoryClick(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{category.description}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-300">
                      <p>Created At: {format(new Date(category.created_at), 'PPP p')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WikiPage;