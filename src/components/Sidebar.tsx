import { MessageSquare, Trash2, Plus, Pencil, Check, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Chat, ProviderType } from '../lib/types';
import { deleteChat } from '../lib/store';
import { ProviderList } from './ProviderList';

interface SidebarProps {
  chats: Chat[];
  currentChat: Chat;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  provider: ProviderType;
  onProviderChange: (provider: ProviderType) => void;
  model: string;
  onModelChange: (model: string) => void;
  onNewChat: () => void;
}

interface EditableChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}

const EditableChatItem = ({ chat, isActive, onSelect, onDelete, onRename }: EditableChatItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    const newTitle = title.trim();
    if (newTitle) {
      onRename(newTitle);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setTitle(chat.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
        isActive
          ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10'
          : 'hover:bg-gradient-to-r hover:from-indigo-500/5 hover:to-purple-500/5'
      }`}
      onClick={() => {
        if (!isEditing && !showDeleteConfirm) {
          onSelect();
        }
      }}
    >
      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
        isActive ? 'text-indigo-500' : 'text-zinc-500'
      }`} />
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white/50 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRename();
            }}
            className="p-1 hover:bg-green-100 rounded"
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTitle(chat.title);
              setIsEditing(false);
            }}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ) : (
        <>
          <span className={`text-sm truncate flex-1 ${
            isActive ? 'text-zinc-900 font-medium' : 'text-zinc-900'
          }`}>
            {chat.title || 'New Chat'}
          </span>
          
          {!showDeleteConfirm && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 hover:bg-indigo-100 rounded transition-colors"
              >
                <Pencil className="w-4 h-4 text-indigo-600" />
              </button>
              {chat.id !== 'default' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          )}

          {showDeleteConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete?</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 hover:bg-red-100 rounded"
              >
                <Check className="w-4 h-4 text-red-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const Sidebar = ({ 
  chats, 
  currentChat, 
  onSelectChat, 
  onDeleteChat,
  provider,
  onProviderChange,
  onNewChat
}: SidebarProps) => {
  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId);
    onDeleteChat(chatId);
  };

  const handleRenameChat = (chat: Chat, newTitle: string) => {
    const updatedChat = { ...chat, title: newTitle };
    onSelectChat(updatedChat);
  };

  return (
    <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-purple-100 flex flex-col h-full">
      <div className="p-4 border-b border-purple-100">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text">
          MultiMind
        </h1>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          <ProviderList 
            value={provider} 
            onChange={onProviderChange}
          />
          
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-900">Chats</h3>
            {chats.map((chat) => (
              <EditableChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === currentChat.id}
                onSelect={() => onSelectChat(chat)}
                onDelete={() => handleDeleteChat(chat.id)}
                onRename={(newTitle) => handleRenameChat(chat, newTitle)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};