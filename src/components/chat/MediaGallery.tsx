import { useState, useEffect } from 'react';
import { X, Image, Video, FileText, Mic, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { ChatMediaResult } from '../../types/database';
import { getChatMedia } from '../../services/messaging';

interface MediaGalleryProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

type MediaTab = 'all' | 'image' | 'video' | 'file' | 'voice';

export function MediaGallery({ conversationId, isOpen, onClose }: MediaGalleryProps) {
  const [media, setMedia] = useState<ChatMediaResult[]>([]);
  const [activeTab, setActiveTab] = useState<MediaTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<ChatMediaResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen, conversationId, activeTab]);

  const loadMedia = async () => {
    setIsLoading(true);
    const mediaType = activeTab === 'all' ? undefined : activeTab;
    const data = await getChatMedia(conversationId, mediaType, 100);
    setMedia(data);
    setIsLoading(false);
  };

  const tabs: { id: MediaTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: null },
    { id: 'image', label: 'Photos', icon: <Image size={16} /> },
    { id: 'video', label: 'Videos', icon: <Video size={16} /> },
    { id: 'file', label: 'Files', icon: <FileText size={16} /> },
    { id: 'voice', label: 'Voice', icon: <Mic size={16} /> },
  ];

  const openLightbox = (item: ChatMediaResult, index: number) => {
    setSelectedMedia(item);
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const goToPrevious = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : media.length - 1;
    setSelectedIndex(newIndex);
    setSelectedMedia(media[newIndex]);
  };

  const goToNext = () => {
    const newIndex = selectedIndex < media.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    setSelectedMedia(media[newIndex]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Media Gallery</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Image size={48} className="mb-3 opacity-50" />
              <p>No media found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => openLightbox(item, index)}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group"
                >
                  {item.message_type === 'image' && (
                    <img
                      src={item.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {item.message_type === 'video' && (
                    <>
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="text-white" size={24} />
                      </div>
                    </>
                  )}
                  {item.message_type === 'file' && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <FileText size={32} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500 truncate w-full text-center">
                        {item.media_metadata?.filename || 'File'}
                      </span>
                    </div>
                  )}
                  {item.message_type === 'voice' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Mic size={32} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">
                        {item.media_metadata?.duration
                          ? `${Math.floor(item.media_metadata.duration)}s`
                          : 'Voice'}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedMedia && (
        <div className="fixed inset-0 z-60 bg-black flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
          >
            <X size={24} />
          </button>

          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronRight size={28} />
          </button>

          <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center">
            {selectedMedia.message_type === 'image' && (
              <img
                src={selectedMedia.media_url}
                alt=""
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
            {selectedMedia.message_type === 'video' && (
              <video
                src={selectedMedia.media_url}
                controls
                className="max-w-full max-h-[80vh]"
              />
            )}

            <div className="mt-4 flex items-center gap-4 text-white/80 text-sm">
              <span>{formatDate(selectedMedia.created_at)}</span>
              {selectedMedia.media_metadata?.size && (
                <span>{formatFileSize(selectedMedia.media_metadata.size)}</span>
              )}
              <a
                href={selectedMedia.media_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-white"
              >
                <Download size={16} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
