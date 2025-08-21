import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";
import { Calendar, Clock, Users, Star, DollarSign, Settings, Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/toaster";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [shows, setShows] = useState([]);
  const [currentShow, setCurrentShow] = useState(null);
  const [acts, setActs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [actDialog, setActDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const [editingAct, setEditingAct] = useState(null);
  const { toast } = useToast();

  // Form states
  const [showForm, setShowForm] = useState({
    title: '',
    date: '',
    venue: '',
    description: ''
  });

  const [actForm, setActForm] = useState({
    name: '',
    performers: '',
    duration: '',
    description: '',
    staging_notes: '',
    sound_requirements: '',
    lighting_requirements: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: '',
    act_id: ''
  });

  useEffect(() => {
    fetchShows();
  }, []);

  useEffect(() => {
    if (currentShow) {
      fetchActs(currentShow.id);
      fetchExpenses(currentShow.id);
    }
  }, [currentShow]);

  const fetchShows = async () => {
    try {
      const response = await axios.get(`${API}/shows`);
      setShows(response.data);
      if (response.data.length > 0 && !currentShow) {
        setCurrentShow(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching shows:', error);
      toast({
        title: "Error",
        description: "Failed to load shows",
        variant: "destructive",
      });
    }
  };

  const fetchActs = async (showId) => {
    try {
      const response = await axios.get(`${API}/acts/show/${showId}`);
      setActs(response.data);
    } catch (error) {
      console.error('Error fetching acts:', error);
    }
  };

  const fetchExpenses = async (showId) => {
    try {
      const response = await axios.get(`${API}/expenses/show/${showId}`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleCreateShow = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/shows`, showForm);
      setShows([response.data, ...shows]);
      setCurrentShow(response.data);
      setShowForm({ title: '', date: '', venue: '', description: '' });
      setShowDialog(false);
      toast({
        title: "Success",
        description: "Show created successfully",
      });
    } catch (error) {
      console.error('Error creating show:', error);
      toast({
        title: "Error",
        description: "Failed to create show",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAct = async () => {
    try {
      setLoading(true);
      const actData = {
        ...actForm,
        show_id: currentShow.id,
        duration: parseInt(actForm.duration),
        sequence_order: acts.length + 1
      };

      if (editingAct) {
        await axios.put(`${API}/acts/${editingAct.id}`, actData);
        toast({
          title: "Success",
          description: "Act updated successfully",
        });
      } else {
        await axios.post(`${API}/acts`, actData);
        toast({
          title: "Success",
          description: "Act created successfully",
        });
      }

      // Fix: Ensure acts are refreshed after creation/update
      await fetchActs(currentShow.id);
      setActForm({
        name: '',
        performers: '',
        duration: '',
        description: '',
        staging_notes: '',
        sound_requirements: '',
        lighting_requirements: ''
      });
      setActDialog(false);
      setEditingAct(null);
    } catch (error) {
      console.error('Error saving act:', error);
      toast({
        title: "Error",
        description: "Failed to save act",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    try {
      setLoading(true);
      const expenseData = {
        ...expenseForm,
        show_id: currentShow.id,
        amount: parseFloat(expenseForm.amount),
        act_id: expenseForm.act_id || null
      };

      await axios.post(`${API}/expenses`, expenseData);
      fetchExpenses(currentShow.id);
      setExpenseForm({
        category: '',
        amount: '',
        description: '',
        date: '',
        act_id: ''
      });
      setExpenseDialog(false);
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAct = async (actId) => {
    try {
      await axios.delete(`${API}/acts/${actId}`);
      fetchActs(currentShow.id);
      toast({
        title: "Success",
        description: "Act deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting act:', error);
      toast({
        title: "Error",
        description: "Failed to delete act",
        variant: "destructive",
      });
    }
  };

  const handleEditAct = (act) => {
    setEditingAct(act);
    setActForm({
      name: act.name,
      performers: act.performers || '',
      duration: act.duration.toString(),
      description: act.description || '',
      staging_notes: act.staging_notes || '',
      sound_requirements: act.sound_requirements || '',
      lighting_requirements: act.lighting_requirements || ''
    });
    setActDialog(true);
  };

  const getTotalDuration = () => {
    return acts.reduce((total, act) => total + act.duration, 0);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  if (!currentShow && shows.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-rose-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to Circus Manager</CardTitle>
            <CardDescription>Create your first circus show to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Show
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Show</DialogTitle>
                  <DialogDescription>Add details for your circus show</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Show Title</Label>
                    <Input
                      id="title"
                      value={showForm.title}
                      onChange={(e) => setShowForm({...showForm, title: e.target.value})}
                      placeholder="Enter show title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={showForm.date}
                      onChange={(e) => setShowForm({...showForm, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="venue">Venue</Label>
                    <Input
                      id="venue"
                      value={showForm.venue}
                      onChange={(e) => setShowForm({...showForm, venue: e.target.value})}
                      placeholder="Enter venue name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={showForm.description}
                      onChange={(e) => setShowForm({...showForm, description: e.target.value})}
                      placeholder="Show description"
                    />
                  </div>
                  <Button onClick={handleCreateShow} disabled={loading || !showForm.title} className="w-full">
                    Create Show
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-rose-50">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-rose-500 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentShow?.title}</h1>
                <p className="text-sm text-gray-600">{currentShow?.venue} • {currentShow?.date}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="border-purple-200 text-purple-700">
                <Clock className="h-3 w-3 mr-1" />
                {getTotalDuration()} min
              </Badge>
              <Badge variant="outline" className="border-green-200 text-green-700">
                <DollarSign className="h-3 w-3 mr-1" />
                ${getTotalExpenses()}
              </Badge>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Show
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Show</DialogTitle>
                    <DialogDescription>Add details for your circus show</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Show Title</Label>
                      <Input
                        id="title"
                        value={showForm.title}
                        onChange={(e) => setShowForm({...showForm, title: e.target.value})}
                        placeholder="Enter show title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={showForm.date}
                        onChange={(e) => setShowForm({...showForm, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="venue">Venue</Label>
                      <Input
                        id="venue"
                        value={showForm.venue}
                        onChange={(e) => setShowForm({...showForm, venue: e.target.value})}
                        placeholder="Enter venue name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={showForm.description}
                        onChange={(e) => setShowForm({...showForm, description: e.target.value})}
                        placeholder="Show description"
                      />
                    </div>
                    <Button onClick={handleCreateShow} disabled={loading || !showForm.title} className="w-full">
                      Create Show
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="program" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-fit">
            <TabsTrigger value="program">Program</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
          </TabsList>

          {/* Program Tab */}
          <TabsContent value="program" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Show Program</h2>
              <Dialog open={actDialog} onOpenChange={setActDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Act
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingAct ? 'Edit Act' : 'Add New Act'}</DialogTitle>
                    <DialogDescription>Configure the details for this circus act</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Act Name</Label>
                      <Input
                        id="name"
                        value={actForm.name}
                        onChange={(e) => setActForm({...actForm, name: e.target.value})}
                        placeholder="e.g., Aerial Silks"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={actForm.duration}
                        onChange={(e) => setActForm({...actForm, duration: e.target.value})}
                        placeholder="15"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="performers">Performers</Label>
                      <Input
                        id="performers"
                        value={actForm.performers}
                        onChange={(e) => setActForm({...actForm, performers: e.target.value})}
                        placeholder="List performer names"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={actForm.description}
                        onChange={(e) => setActForm({...actForm, description: e.target.value})}
                        placeholder="Act description and notes"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="staging">Staging Notes</Label>
                      <Textarea
                        id="staging"
                        value={actForm.staging_notes}
                        onChange={(e) => setActForm({...actForm, staging_notes: e.target.value})}
                        placeholder="Stage setup, props, positioning"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sound">Sound Requirements</Label>
                      <Textarea
                        id="sound"
                        value={actForm.sound_requirements}
                        onChange={(e) => setActForm({...actForm, sound_requirements: e.target.value})}
                        placeholder="Music, microphones, sound effects"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lighting">Lighting Requirements</Label>
                      <Textarea
                        id="lighting"
                        value={actForm.lighting_requirements}
                        onChange={(e) => setActForm({...actForm, lighting_requirements: e.target.value})}
                        placeholder="Spotlights, colors, special effects"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateAct} disabled={loading || !actForm.name || !actForm.duration} className="w-full mt-4">
                    {editingAct ? 'Update Act' : 'Add Act'}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {acts.map((act, index) => (
                <Card key={act.id} className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-700">
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{act.name}</CardTitle>
                          <CardDescription>
                            {act.performers && (
                              <span className="flex items-center mr-4">
                                <Users className="h-3 w-3 mr-1" />
                                {act.performers}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {act.duration} minutes
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditAct(act)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAct(act.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardHeader>
                  {(act.description || act.staging_notes || act.sound_requirements || act.lighting_requirements) && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {act.description && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                            <p className="text-gray-600">{act.description}</p>
                          </div>
                        )}
                        {act.staging_notes && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Staging</h4>
                            <p className="text-gray-600">{act.staging_notes}</p>
                          </div>
                        )}
                        {act.sound_requirements && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Sound</h4>
                            <p className="text-gray-600">{act.sound_requirements}</p>
                          </div>
                        )}
                        {act.lighting_requirements && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Lighting</h4>
                            <p className="text-gray-600">{act.lighting_requirements}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {acts.length === 0 && (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-12">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No acts yet</h3>
                  <p className="text-gray-600 mb-4">Start building your show by adding your first circus act</p>
                  <Dialog open={actDialog} onOpenChange={setActDialog}>
                    <DialogTrigger asChild>
                      <Button>Add First Act</Button>
                    </DialogTrigger>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Expenses</h2>
              <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                    <DialogDescription>Record a new expense for this show</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({...expenseForm, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="performer_fee">Performer Fee</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="venue">Venue</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                        placeholder="Expense description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="act">Related Act (Optional)</Label>
                      <Select value={expenseForm.act_id} onValueChange={(value) => setExpenseForm({...expenseForm, act_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select act" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {acts.map((act) => (
                            <SelectItem key={act.id} value={act.id}>{act.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateExpense} disabled={loading || !expenseForm.category || !expenseForm.amount || !expenseForm.description} className="w-full">
                      Add Expense
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium">Total Expenses: ${getTotalExpenses().toFixed(2)}</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <div key={expense.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary">{expense.category.replace('_', ' ')}</Badge>
                        <span className="font-medium">{expense.description}</span>
                      </div>
                      {expense.date && (
                        <p className="text-sm text-gray-500 mt-1">{expense.date}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">${expense.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {expenses.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No expenses recorded yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Technical Tab */}
          <TabsContent value="technical" className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Technical Requirements</h2>
            
            <div className="grid gap-6">
              {acts.map((act) => (
                <Card key={act.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{act.name}</span>
                      <Badge variant="outline">{act.duration} min</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Staging
                        </h4>
                        <p className="text-sm text-gray-600">
                          {act.staging_notes || 'No staging requirements specified'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Sound
                        </h4>
                        <p className="text-sm text-gray-600">
                          {act.sound_requirements || 'No sound requirements specified'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Lighting
                        </h4>
                        <p className="text-sm text-gray-600">
                          {act.lighting_requirements || 'No lighting requirements specified'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {acts.length === 0 && (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-12">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No technical requirements</h3>
                  <p className="text-gray-600">Add acts to your show to manage technical requirements</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  );
}

export default App;