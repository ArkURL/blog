import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import Slug from '..'
import { checkSlugHasOneSlash } from '@/lib/utils/post'
import { isExport } from '@/lib/utils/buildMode'
import { getPriorityPages, prefetchAllBlockMaps } from '@/lib/build/prefetch'

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })

  // Export 模式：全量预生成
  if (isExport()) {
    await prefetchAllBlockMaps(allPages)
    return {
      paths: allPages
        ?.filter(row => checkSlugHasOneSlash(row))
        .map(row => ({
          params: {
            prefix: row.slug.split('/')[0],
            slug: row.slug.split('/')[1]
          }
        })),
      fallback: false
    }
  }

  // ISR 模式：预生成最新10篇（仅两段路径格式）
  const tops = getPriorityPages(allPages)

  await prefetchAllBlockMaps(tops)

  return {
    paths: tops
      .filter(p => checkSlugHasOneSlash(p))
      .map(row => ({
        params: {
          prefix: row.slug.split('/')[0],
          slug: row.slug.split('/')[1]
        }
      })),
    fallback: 'blocking'
  }
}

export async function getStaticProps({ params: { prefix, slug }, locale }) {
  try {
    const props = await resolvePostProps({
      prefix,
      slug,
      locale,
    })

    // 降级处理：如果找不到文章，返回一个错误提示页，而不是 404 (导致构建失败)
    if (!props?.post) {
      console.warn(`[getStaticProps] 无法找到文章，返回降级页面: /${prefix}/${slug}`)
      return {
        props: {
          post: {
            id: `error-${prefix}-${slug}`,
            title: '文章暂时无法访问',
            summary: '该文章可能已被隐藏、删除或正在生成中。',
            status: 'Published',
            type: 'Post',
            slug: `${prefix}/${slug}`,
            date: { start_date: new Date().toISOString().slice(0, 10) },
            tags: [],
            tagItems: []
          },
          NOTION_CONFIG: props?.NOTION_CONFIG || {},
          siteInfo: props?.siteInfo || {},
        },
        revalidate: 10
      }
    }

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      ),
  }
}

export default PrefixSlug
