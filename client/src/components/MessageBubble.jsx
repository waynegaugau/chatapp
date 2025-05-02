import PropTypes from 'prop-types';
import { useAuthStore } from '../store/auth';
import { useEffect, useState } from 'react';



// Hàm xác định icon file theo đuôi
function getFileIcon(filename = '') {
  if (!filename) return '📎'; // Nếu filename null/undefined thì trả mặc định

  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return '📄';
    case 'doc':
    case 'docx': return '📝';
    case 'xls':
    case 'xlsx': return '📊';
    case 'zip':
    case 'rar': return '🗜️';
    case 'ppt':
    case 'pptx': return '📽️';
    case 'mp3':
    case 'wav': return '🎵';
    case 'mp4':
    case 'mov': return '🎬';
    default: return '📎';
  }
}

const openSecureFile = async (attachmentPath) => {
  try {
   // const res = await fetch(`http://localhost:5000/file?filename=${encodeURIComponent(attachmentPath)}`);
    const res = await fetch(`${import.meta.env.VITE_SERVER_ORIGIN}/file?filename=${encodeURIComponent(attachmentPath)}`);    
    const data = await res.json();
    if (data.url) {
      window.open(data.url, '_blank');
    } else {
      console.error('Failed to get signed URL');
    }
  } catch (error) {
    console.error('Error fetching signed URL:', error);
  }
};

function extractFilename(url) {
  try {
    const decodedUrl = decodeURIComponent(url);
    const startIndex = decodedUrl.indexOf('/o/') + 3;
    const endIndex = decodedUrl.indexOf('?alt=');
    if (startIndex !== -1 && endIndex !== -1) {
      return decodedUrl.substring(startIndex, endIndex); // Trích đúng phần tên file cần thiết
    }
  } catch (error) {
    console.error('Error extracting filename:', error);
  }
  return '';
}


export default function MessageBubble({ data, status, scrollToBottom }) {
  const user = useAuthStore((state) => state.user);
  const sendType = user._id === data.sender;
  const [imageUrl, setImageUrl] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  
  const isImage = data.mimeType?.startsWith('image/');

useEffect(() => {
  const fetchSignedUrl = async () => {
    if (data.attachment && isImage) {
      try {
        const filename = data.attachment.includes('firebasestorage.googleapis.com')
          ? extractFilename(data.attachment)
          : data.attachment;

        if (!filename) {
          console.error('Filename is empty, cannot fetch signed URL');
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_SERVER_ORIGIN}/file?filename=${encodeURIComponent(filename)}`);
        const result = await res.json();
        console.log('Fetched signed URL:', result.url);  // 💥 Log kết quả trực tiếp
        if (result.url) {
          setSignedUrl(result.url);
        }
      } catch (error) {
        console.error('Error fetching signed URL for image preview:', error);
      }
    }
  };

  fetchSignedUrl();
}, [data.attachment]);



//  useEffect(() => {
//    const fetchSignedUrl = async () => {
//      if (data.attachment && data.mimeType?.startsWith('image/')) {
//        try {
//          const res = await fetch(`${import.meta.env.VITE_SERVER_ORIGIN}/file?filename=${encodeURIComponent(filename)}`);
//          const result = await res.json();
//          if (result.url) {
//            setImageUrl(result.url);
//          }
//        } catch (error) {
//          console.error('Error fetching signed URL for image preview:', error);
//        }
//      }
//    };
//
//    fetchSignedUrl();
//  }, [data]);

  // 🧠 Kiểm tra nếu file là ảnh
 // const isImage = data.mimeType?.startsWith('image/');

  return (
    <div
      className={`flex gap-4 max-w-[80%] ${sendType && 'self-end flex-row-reverse'
        }`}
    >
      <div
        className={`px-4 py-2 rounded-xl w-max sm:max-w-sm md:max-w-md xl:max-w-xl ${sendType
          ? 'bg-darkBg rounded-br-none'
          : 'bg-accentDark text-darkerBG rounded-bl-none font-semibold'
          }`}
      >
        {/* Nếu có đính kèm và là ảnh */}
        {isImage && signedUrl && (
          <img
            src={signedUrl}
            alt="attachment"
            className="mx-auto my-2 rounded-md cursor-pointer w-60 h-max min-h-32 max-h-80 object-cover"
            onLoad={() => scrollToBottom()}
            onClick={() => window.open(signedUrl, '_blank')}
	//    onClick={async () => 
	// {
        //      try {
        //        const res = await fetch(`http://localhost:5000/file?filename=${encodeURIComponent(data.attachment)}`);
        //        const result = await res.json();
        //        if (result.url) {
        //          window.open(result.url, '_blank');
        //        }
        //      } catch (error) {
        //        console.error('Error fetching signed URL on click:', error);
        //      }
        //    }}
        //    
          />
        )}


        {/* Nếu có đính kèm và KHÔNG phải ảnh */}
        {data.attachment && !isImage && (
          <a
            onClick={() => openSecureFile(data.attachment)}
            className="flex items-center gap-2 my-2 p-2 rounded-md bg-white text-blue-600 border border-blue-300 hover:bg-blue-50"
            title={data.originalName || 'Tệp đính kèm'}
          >
            <span className="text-xl">{getFileIcon(data.originalName)}</span>
            <span className="underline text-sm">
              {data.originalName || 'Tệp đính kèm'}
            </span>
          </a>
        )}


        {/* Nội dung message nếu có */}
        <span>{data.message}</span>
      </div>

      <div
        className={`flex flex-col justify-center gap-1 w-full max-w-max text-xs font-light text-gray-600 ${sendType && 'items-end'
          }`}
      >
        <p>
          {new Date(data.sentAt).toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
          })}
        </p>

        {sendType && status && <p>{status}</p>}
      </div>
    </div>
  );



}

MessageBubble.propTypes = {
  data: PropTypes.object,
  status: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  scrollToBottom: PropTypes.func,
};
