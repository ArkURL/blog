import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import Slug from '..'
import { checkSlugHasOneSlash } from '@/lib/utils/post'

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
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })

  // 根据slug中的 / 分割成prefix和slug两个字段 ; 例如 article/test
  // 最终用户可以通过  [domain]/[prefix]/[slug] 路径访问，即这里的 [domain]/article/test
  const paths = allPages
    ?.filter(row => checkSlugHasOneSlash(row))
    .map(row => ({
      params: { prefix: row.slug.split('/')[0], slug: row.slug.split('/')[1] }
    }))

  // 增加一种访问路径 允许通过 [category]/[slug] 访问文章
  // 例如文章slug 是 test ，然后文章的分类category是 production
  // 则除了 [domain]/[slug] 以外，还支持分类名访问: [domain]/[category]/[slug]

  return {
    paths: paths,
    fallback: true
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
  } catch (error) {
    console.error(`[getStaticProps] 构建页面失败: /${prefix}/${slug}`, error)
    // 发生异常时也返回降级页面
    return {
      props: {
        post: {
          id: `error-${prefix}-${slug}`,
          title: '构建失败',
          summary: '生成此页面时发生错误，请查看后台日志。',
          status: 'Published',
          type: 'Post',
          slug: `${prefix}/${slug}`,
          date: { start_date: new Date().toISOString().slice(0, 10) },
          tags: [],
          tagItems: []
        },
        NOTION_CONFIG: {},
        siteInfo: {},
      },
      revalidate: 10
    }
  }
}

export default PrefixSlug
