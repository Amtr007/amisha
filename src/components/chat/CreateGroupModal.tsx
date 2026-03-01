import { useState, useEffect, useRef } from 'react';
import { X, Camera, Search, Check, Users } from 'lucide-react';
import type { User } from '../../types/database';
import { getAllUsers, searchUsers } from '../../services/messaging';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserAvatar } from './UserAvatar';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[], description?: string, photoFile?: File) => Promise<void>;
}

export function CreateGroupModal({ isOpen, onClose, onCreate }: CreateGroupModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'members' | 'details'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadUsers();
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen) {
      setStep('members');
      setSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
      setGroupDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }, [isOpen]);

  const loadUsers = async () => {
    if (!user?.id) return;
    setIsSearching(true);
    const data = searchQuery
      ? await searchUsers(searchQuery, user.id)
      : await getAllUsers(user.id);
    setUsers(data);
    setIsSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.id) loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  const toggleUser = (userToToggle: User) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === userToToggle.id)
        ? prev.filter((u) => u.id !== userToToggle.id)
        : [...prev, userToToggle]
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setIsCreating(true);
    await onCreate(
      groupName.trim(),
      selectedUsers.map((u) => u.id),
      groupDescription.trim() || undefined,
      photoFile || undefined
    );
    setIsCreating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'members' ? 'Add Members' : 'New Group'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {step === 'members' ? (
          <>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u)}
                      className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-teal-100 text-teal-700 rounded-full text-sm"
                    >
                      <UserAvatar user={u} size="xs" />
                      <span>{u.display_name || u.username}</span>
                      <X size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              ) : (
                <div className="py-2">
                  {users.map((u) => {
                    const isSelected = selectedUsers.some((s) => s.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleUser(u)}
                        className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <UserAvatar user={u} />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">
                            {u.display_name || u.username}
                          </p>
                          <p className="text-sm text-gray-500">@{u.username}</p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check size={14} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setStep('details')}
                disabled={selectedUsers.length === 0}
              >
                Next ({selectedUsers.length} selected)
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={40} className="text-gray-400" />
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-teal-700 transition-colors"
                  >
                    <Camera size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Group Name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="What's this group about?"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Members ({selectedUsers.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        <UserAvatar user={u} size="xs" />
                        <span className="text-gray-700">{u.display_name || u.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('members')}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleCreate}
                isLoading={isCreating}
                disabled={!groupName.trim()}
              >
                Create Group
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
