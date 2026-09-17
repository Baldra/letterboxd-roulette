import { useEffect, useState } from 'react';
import { classifyError, localGifUrl, randomGifUrl } from '../errorGifs';

interface ErrorPanelProps {
  status: number;
  message: string;
}

export function ErrorPanel({ status, message }: ErrorPanelProps) {
  const reason = classifyError(status);
  const localUrl = localGifUrl(reason);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [showRemote, setShowRemote] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setRemoteUrl(null);
    setShowRemote(false);
    setGifFailed(false);
    randomGifUrl(reason).then((url) => {
      if (active && url) {
        setRemoteUrl(url);
        setShowRemote(true);
      }
    });
    return () => {
      active = false;
    };
  }, [reason]);

  const src = showRemote && remoteUrl ? remoteUrl : localUrl;

  return (
    <div className="error" role="alert">
      {!gifFailed ? (
        <img
          className="error__gif"
          src={src}
          alt={`Movie-themed illustration for ${reason.replace(/-/g, ' ')}`}
          onError={() => {
            if (showRemote) {
              setShowRemote(false);
            } else {
              setGifFailed(true);
            }
          }}
        />
      ) : null}
      <p className="error__message">{message}</p>
    </div>
  );
}