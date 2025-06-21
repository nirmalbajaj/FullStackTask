import React, { useState, useEffect } from 'react';
import { User, MessageSquare, Edit2, Check, LogOut, Users, BarChart3, Calendar } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const FeedbackSystem = () => {
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [feedbackList, setFeedbackList] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    employee_id: '',
    strengths: '',
    areas_to_improve: '',
    sentiment: 'positive'
  });

  // Fetch dashboard data
  const fetchDashboardData = async (userId, role) => {
    try {
      const endpoint = role === 'manager' 
        ? `${API_BASE}/dashboard/manager/${userId}`
        : `${API_BASE}/dashboard/employee/${userId}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!loginForm.username || !loginForm.password) {
      alert('Please enter both username and password');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setLoginForm({ username: '', password: '' });
        
        if (userData.role === 'manager') {
          fetchTeamMembers(userData.user_id);
          fetchManagerFeedback(userData.user_id);
          fetchDashboardData(userData.user_id, 'manager');
        } else {
          fetchEmployeeFeedback(userData.user_id);
          fetchDashboardData(userData.user_id, 'employee');
        }
      } else {
        const errorData = await response.json();
        alert('Login failed: ' + (errorData.detail || 'Invalid credentials'));
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Connection error. Make sure the backend server is running on port 8000.');
    }
  };

  // Fetch team members (for managers)
  const fetchTeamMembers = async (managerId) => {
    try {
      const response = await fetch(`${API_BASE}/team-members/${managerId}`);
      const members = await response.json();
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  // Fetch feedback for employee
  const fetchEmployeeFeedback = async (employeeId) => {
    try {
      const response = await fetch(`${API_BASE}/feedback/employee/${employeeId}`);
      const feedback = await response.json();
      setFeedbackList(feedback);
    } catch (error) {
      console.error('Error fetching employee feedback:', error);
    }
  };

  // Fetch feedback for manager
  const fetchManagerFeedback = async (managerId) => {
    try {
      const response = await fetch(`${API_BASE}/feedback/manager/${managerId}`);
      const feedback = await response.json();
      setFeedbackList(feedback);
    } catch (error) {
      console.error('Error fetching manager feedback:', error);
    }
  };

  // Updated handleFeedbackSubmit function - replace the existing one
const handleFeedbackSubmit = async (e) => {
  e.preventDefault();
  
  if (!feedbackForm.employee_id || !feedbackForm.strengths || !feedbackForm.areas_to_improve) {
    alert('Please fill in all required fields');
    return;
  }
  
  try {
    if (editingFeedback) {
      // Update existing feedback
      const response = await fetch(`${API_BASE}/feedback/${editingFeedback.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strengths: feedbackForm.strengths,
          areas_to_improve: feedbackForm.areas_to_improve,
          sentiment: feedbackForm.sentiment
        })
      });
      
      if (response.ok) {
        fetchManagerFeedback(user.user_id);
        fetchDashboardData(user.user_id, 'manager'); // Added this line
        setEditingFeedback(null);
      }
    } else {
      // Create new feedback
      const response = await fetch(`${API_BASE}/feedback?manager_id=${user.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackForm)
      });
      
      if (response.ok) {
        fetchManagerFeedback(user.user_id);
        fetchDashboardData(user.user_id, 'manager'); // Added this line
      }
    }
    
    setFeedbackForm({
      employee_id: '',
      strengths: '',
      areas_to_improve: '',
      sentiment: 'positive'
    });
    setShowFeedbackForm(false);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    alert('Error submitting feedback. Please try again.');
  }
};

  // Acknowledge feedback
  const acknowledgeFeedback = async (feedbackId) => {
    try {
      await fetch(`${API_BASE}/feedback/${feedbackId}/acknowledge`, {
        method: 'PUT'
      });
      fetchEmployeeFeedback(user.user_id);
    } catch (error) {
      console.error('Error acknowledging feedback:', error);
    }
  };

  // Start editing feedback
  const startEditFeedback = (feedback) => {
    setEditingFeedback(feedback);
    setFeedbackForm({
      employee_id: feedback.employee_id,
      strengths: feedback.strengths,
      areas_to_improve: feedback.areas_to_improve,
      sentiment: feedback.sentiment
    });
    setShowFeedbackForm(true);
  };


  const handleLogout = () => {
  
    setUser(null);
    setFeedbackList([]);
    setTeamMembers([]);
    setShowFeedbackForm(false);
    setEditingFeedback(null);
    setDashboardData(null); 
    setFeedbackForm({
      employee_id: "",
      strengths: "",
      areas_to_improve: "",
      sentiment: "positive",
    });
    setLoginForm({ username: "", password: "" }); 
  };

  // Render login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <MessageSquare className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Feedback System</h1>
            <p className="text-gray-600 mt-2">Login to continue</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </div>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
              />
            </div>
            
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </div>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Login
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-md text-sm text-gray-600">
            <p className="font-medium mb-2">Demo Credentials:</p>
            <p>Manager: manager1 / password123</p>
            <p>Employee: employee1 / password123</p>
            <p>Employee: employee2 / password123</p>
          </div>
        </div>
      </div>
    );
  }

  // Get sentiment color
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Feedback System</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                {user.username} ({user.role})
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Section */}
        {dashboardData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              <BarChart3 className="h-5 w-5 mr-2" />
              Dashboard
            </h2>
            
            {user.role === 'manager' ? (
              <div className="space-y-6">
                {/* Manager Dashboard - Team Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.total_team_members}</div>
                    <div className="text-sm text-blue-600">Team Members</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.total_feedback_given}</div>
                    <div className="text-sm text-green-600">Total Feedback Given</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {dashboardData.team_overview.filter(member => member.total_feedback > 0).length}
                    </div>
                    <div className="text-sm text-purple-600">Members with Feedback</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Team Overview</h3>
                  {dashboardData.team_overview.map((member) => (
                    <div key={member.employee_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{member.employee_name}</h4>
                          <p className="text-sm text-gray-500">{member.total_feedback} feedback entries</p>
                        </div>
                        {member.latest_feedback_date && (
                          <span className="text-xs text-gray-400">
                            Last: {new Date(member.latest_feedback_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span>Positive: {member.sentiment_breakdown.positive}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                          <span>Neutral: {member.sentiment_breakdown.neutral}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span>Negative: {member.sentiment_breakdown.negative}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Employee Dashboard - Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.total_feedback}</div>
                    <div className="text-sm text-blue-600">Total Feedback</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.sentiment_breakdown.positive}</div>
                    <div className="text-sm text-green-600">Positive</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{dashboardData.sentiment_breakdown.neutral}</div>
                    <div className="text-sm text-yellow-600">Neutral</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{dashboardData.unacknowledged_count}</div>
                    <div className="text-sm text-red-600">Unread</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Feedback Timeline
                  </h3>
                  {dashboardData.timeline.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No feedback received yet</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.timeline.map((entry, index) => (
                        <div key={index} className="flex items-center space-x-4 p-3 border-l-4 border-gray-200 bg-gray-50 rounded-r-lg">
                          <div className={`w-3 h-3 rounded-full ${
                            entry.sentiment === 'positive' ? 'bg-green-500' :
                            entry.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">
                                Feedback from {entry.manager_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(entry.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(entry.sentiment)}`}>
                                {entry.sentiment}
                              </span>
                              {entry.acknowledged && (
                                <span className="text-green-600 text-xs">✓ Read</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manager View */}
        {user.role === 'manager' && (
          <div className="space-y-6">
            {/* Team Members Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Team Members
                </h2>
                <button
                  onClick={() => {
                    setShowFeedbackForm(true);
                    setEditingFeedback(null);
                    setFeedbackForm({
                      employee_id: '',
                      strengths: '',
                      areas_to_improve: '',
                      sentiment: 'positive'
                    });
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Add Feedback
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="border rounded-lg p-4">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="font-medium">{member.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Form */}
            {showFeedbackForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingFeedback ? 'Edit Feedback' : 'Add New Feedback'}
                </h3>
                
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee
                    </label>
                    <select
                      value={feedbackForm.employee_id}
                      onChange={(e) => setFeedbackForm({...feedbackForm, employee_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={editingFeedback}
                    >
                      <option value="">Select an employee</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strengths
                    </label>
                    <textarea
                      value={feedbackForm.strengths}
                      onChange={(e) => setFeedbackForm({...feedbackForm, strengths: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Areas to Improve
                    </label>
                    <textarea
                      value={feedbackForm.areas_to_improve}
                      onChange={(e) => setFeedbackForm({...feedbackForm, areas_to_improve: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overall Sentiment
                    </label>
                    <select
                      value={feedbackForm.sentiment}
                      onChange={(e) => setFeedbackForm({...feedbackForm, sentiment: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      {editingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setEditingFeedback(null);
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Feedback History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {user.role === 'manager' ? 'Feedback Given' : 'Feedback Received'}
            </h2>
          </div>
          
          <div className="divide-y">
            {feedbackList.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No feedback available</p>
            ) : (
              feedbackList.map((feedback) => (
                <div key={feedback.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {user.role === 'manager' ? (
                          <span className="font-medium text-gray-900">
                            To: {feedback.employee_name}
                          </span>
                        ) : (
                          <span className="font-medium text-gray-900">
                            From: {feedback.manager_name}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(feedback.sentiment)}`}>
                          {feedback.sentiment}
                        </span>
                        {!feedback.acknowledged && user.role === 'employee' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(feedback.created_at).toLocaleDateString()} at {new Date(feedback.created_at).toLocaleTimeString()}
                        {feedback.updated_at !== feedback.created_at && (
                          <span className="ml-2">(Updated: {new Date(feedback.updated_at).toLocaleDateString()})</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      {user.role === 'manager' && (
                        <button
                          onClick={() => startEditFeedback(feedback)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {user.role === 'employee' && !feedback.acknowledged && (
                        <button
                          onClick={() => acknowledgeFeedback(feedback.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Strengths:</h4>
                      <p className="text-sm text-gray-700">{feedback.strengths}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Areas to Improve:</h4>
                      <p className="text-sm text-gray-700">{feedback.areas_to_improve}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSystem;