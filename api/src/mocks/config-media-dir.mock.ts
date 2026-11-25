export const CONFIG_MEDIA_DIR_FIXTURES = {
  defaultEnv: { WORKSPACE_ROOT: '/workspace/apps/ibid-website' },
  defaultMediaDir: '/workspace/apps/ibid-website/public/images',
  overrideEnv: {
    WORKSPACE_ROOT: '/workspace/apps/ibid-website',
    MEDIA_DIR: '/custom/media-folder'
  },
  overrideMediaDir: '/custom/media-folder'
} as const;
