import { useState, useEffect } from 'react';
import { X, Plus, Calendar, Bell, Trash2, Edit2, Check } from 'lucide-react';
import type { ImportantDate } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import {
  getImportantDates,
  addImportantDate,
  updateImportantDate,
  deleteImportantDate,
} from '../../services/messaging';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ImportantDatesModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImportantDatesModal({ conversationId, isOpen, onClose }: ImportantDatesModalProps) {
  const { user } = useAuth();
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    notes: '',
    reminder_enabled: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadDates();
    }
  }, [isOpen, conversationId]);

  const loadDates = async () => {
    setIsLoading(true);
    const data = await getImportantDates(conversationId);
    setDates(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: '', date: '', notes: '', reminder_enabled: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!user?.id || !formData.title || !formData.date) return;

    const newDate = await addImportantDate({
      conversation_id: conversationId,
      user_id: user.id,
      title: formData.title,
      date: formData.date,
      notes: formData.notes || null,
      reminder_enabled: formData.reminder_enabled,
    });

    if (newDate) {
      setDates([...dates, newDate].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.title || !formData.date) return;

    const success = await updateImportantDate(editingId, {
      title: formData.title,
      date: formData.date,
      notes: formData.notes || null,
      reminder_enabled: formData.reminder_enabled,
    });

    if (success) {
      setDates(dates.map((d) =>
        d.id === editingId
          ? { ...d, ...formData, updated_at: new Date().toISOString() }
          : d
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteImportantDate(id);
    if (success) {
      setDates(dates.filter((d) => d.id !== id));
    }
  };

  const startEditing = (date: ImportantDate) => {
    setEditingId(date.id);
    setFormData({
      title: date.title,
      date: date.date,
      notes: date.notes || '',
      reminder_enabled: date.reminder_enabled,
    });
    setIsAdding(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isUpcoming = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const daysUntil = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 0) return `In ${diff} days`;
    return `${Math.abs(diff)} days ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Important Dates</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-900 mb-4">
                    {editingId ? 'Edit Date' : 'Add New Date'}
                  </h3>

                  <div className="space-y-4">
                    <Input
                      label="Title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Anniversary, Birthday"
                    />

                    <Input
                      type="date"
                      label="Date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />

                    <Input
                      label="Notes (optional)"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add a note..."
                    />

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.reminder_enabled}
                        onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Enable reminder</span>
                    </label>

                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={editingId ? handleUpdate : handleAdd}
                        leftIcon={<Check size={16} />}
                      >
                        {editingId ? 'Save' : 'Add'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {dates.length === 0 && !isAdding ? (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">No important dates yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    leftIcon={<Plus size={16} />}
                  >
                    Add Date
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dates.map((date) => (
                    <div
                      key={date.id}
                      className={`p-4 rounded-xl border ${
                        isUpcoming(date.date) ? 'bg-teal-50 border-teal-100' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{date.title}</h4>
                            {date.reminder_enabled && (
                              <Bell size={14} className="text-teal-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{formatDate(date.date)}</p>
                          <p className={`text-xs mt-1 ${
                            isUpcoming(date.date) ? 'text-teal-600 font-medium' : 'text-gray-400'
                          }`}>
                            {daysUntil(date.date)}
                          </p>
                          {date.notes && (
                            <p className="text-sm text-gray-500 mt-2">{date.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(date)}
                            className="w-8 h-8 rounded-full hover:bg-white/50 flex items-center justify-center text-gray-500"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(date.id)}
                            className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!isAdding && !editingId && dates.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
              leftIcon={<Plus size={18} />}
            >
              Add Important Date
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
