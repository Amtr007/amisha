import { useState, useEffect, useRef } from 'react';
import { X, Camera, Users, Crown, UserMinus, Shield, Edit2, Check, Loader2 } from 'lucide-react';
import type { ConversationWithDetails, GroupMember, User } from '../../types/database';
import {
  getGroupMembers,
  updateGroupInfo,
  updateMemberRole,
  removeGroupMember,
  uploadGroupPhoto,
  getAllUsers,
} from '../../services/messaging';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserAvatar } from './UserAvatar';

interface GroupInfoModalProps {
  conversation: ConversationWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function GroupInfoModal({ conversation, isOpen, onClose, onUpdate }: GroupInfoModalProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [editForm, setEditForm] = useState({
    name: conversation.group_name || '',
    description: conversation.group_description || '',
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = conversation.currentUserRole === 'admin';

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      setEditForm({
        name: conversation.group_name || '',
        description: conversation.group_description || '',
      });
    }
  }, [isOpen, conversation]);

  const loadMembers = async () => {
    setIsLoading(true);
    const data = await getGroupMembers(conversation.id);
    setMembers(data);
    setIsLoading(false);
  };

  const loadAvailableUsers = async () => {
    if (!user?.id) return;
    const allUsers = await getAllUsers(user.id);
    const memberIds = members.map((m) => m.user_id);
    setAvailableUsers(allUsers.filter((u) => !memberIds.includes(u.id)));
    setShowAddMember(true);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const url = await uploadGroupPhoto(conversation.id, file);
    if (url) {
      await updateGroupInfo(conversation.id, { photoUrl: url });
      onUpdate();
    }
    setIsUploadingPhoto(false);
  };

  const handleSaveInfo = async () => {
    setIsSaving(true);
    await updateGroupInfo(conversation.id, {
      name: editForm.name,
      description: editForm.description,
    });
    setIsSaving(false);
    setIsEditing(false);
    onUpdate();
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    await updateMemberRole(conversation.id, memberId, newRole);
    loadMembers();
    onUpdate();
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeGroupMember(conversation.id, memberId);
    loadMembers();
    onUpdate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Group Info</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-8">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden ring-4 ring-white/30">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : conversation.group_photo_url ? (
                    <img
                      src={conversation.group_photo_url}
                      alt={conversation.group_name || 'Group'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-white" />
                  )}
                </div>
                {isAdmin && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 text-gray-600" />
                    </button>
                  </>
                )}
              </div>

              {isEditing ? (
                <div className="mt-4 w-full max-w-xs space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="Group name"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                    placeholder="Description"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleSaveInfo}
                      disabled={isSaving}
                      className="px-4 py-2 bg-white text-teal-600 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {conversation.group_name || 'Group'}
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                  {conversation.group_description && (
                    <p className="mt-1 text-white/80 text-sm text-center">
                      {conversation.group_description}
                    </p>
                  )}
                  <p className="mt-2 text-white/60 text-sm">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Members</h4>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAvailableUsers}
                >
                  Add Member
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50"
                  >
                    <UserAvatar user={member.user} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {member.user.display_name || member.user.username}
                        </p>
                        {member.role === 'admin' && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                            <Crown size={10} />
                            Admin
                          </span>
                        )}
                        {member.user_id === user?.id && (
                          <span className="text-xs text-gray-400">You</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">@{member.user.username}</p>
                    </div>

                    {isAdmin && member.user_id !== user?.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleRoleChange(
                              member.user_id,
                              member.role === 'admin' ? 'member' : 'admin'
                            )
                          }
                          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
                          title={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-red-500"
                          title="Remove from group"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          users={availableUsers}
          conversationId={conversation.id}
          onClose={() => setShowAddMember(false)}
          onAdded={() => {
            loadMembers();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

interface AddMemberModalProps {
  users: User[];
  conversationId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddMemberModal({ users, conversationId, onClose, onAdded }: AddMemberModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    const { addGroupMember } = await import('../../services/messaging');
    for (const userId of selected) {
      await addGroupMember(conversationId, userId);
    }
    setIsAdding(false);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Members</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users available to add
            </div>
          ) : (
            <div className="py-2">
              {users.map((u) => {
                const isSelected = selected.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() =>
                      setSelected((prev) =>
                        isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      )
                    }
                    className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50"
                  >
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">
                        {u.display_name || u.username}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
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
            onClick={handleAdd}
            isLoading={isAdding}
            disabled={selected.length === 0}
          >
            Add {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
