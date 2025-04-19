import {
	QueryClient,
	QueryClientProvider,
	useInfiniteQuery,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";

const queryClient = new QueryClient();

async function fetchServerPage(
	limit: number,
	offset = 0,
): Promise<{ rows: Array<string>; nextOffset: number }> {
	const rows = new Array(limit)
		.fill(0)
		.map((_, i) => `Async loaded row #${i + offset * limit}`);

	await new Promise((r) => setTimeout(r, 500));

	return { rows, nextOffset: offset + 1 };
}

export function App() {
	const {
		status,
		data,
		error,
		isFetching,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ["projects"],
		queryFn: (ctx) => fetchServerPage(10, ctx.pageParam),
		getNextPageParam: (lastGroup) => lastGroup.nextOffset,
		initialPageParam: 0,
	});

	const allRows = data ? data.pages.flatMap((d) => d.rows) : [];

	const parentRef = useRef<HTMLDivElement>(null);

	const rowVirtualizer = useVirtualizer({
		count: hasNextPage ? allRows.length + 1 : allRows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 100,
		overscan: 5,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();
	useEffect(() => {
		const [lastItem] = [...virtualItems].reverse();
		if (!lastItem) {
			return;
		}
		if (
			lastItem.index >= allRows.length - 1 &&
			hasNextPage &&
			!isFetchingNextPage
		) {
			fetchNextPage();
		}
	}, [
		hasNextPage,
		fetchNextPage,
		allRows.length,
		isFetchingNextPage,
		virtualItems,
	]);

	return (
		<div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
			<div className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-2 text-indigo-800">
					無限スクロールデモ
				</h1>
				<p className="text-gray-600 mb-8">
					このデモはReact
					QueryのuseInfiniteScrollフックを使用してデータを無限に取得し、
					rowVirtualizerを併用してリストの最下部のローダー行がトリガーとなって次のページをロードします。
				</p>

				{status === "pending" ? (
					<div className="flex justify-center items-center h-64">
						<div className="w-8 h-8 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin" />
					</div>
				) : status === "error" ? (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
						<span>エラー: {error.message}</span>
					</div>
				) : (
					<div
						ref={parentRef}
						className="h-[calc(100vh-250px)] overflow-auto border border-gray-200 rounded-lg shadow-md bg-white"
					>
						<div
							style={{
								height: `${rowVirtualizer.getTotalSize()}px`,
								width: "100%",
								position: "relative",
							}}
						>
							{virtualItems.map((virtualRow) => {
								const isLoaderRow = virtualRow.index > allRows.length - 1;
								const post = allRows[virtualRow.index];

								return (
									<div
										key={virtualRow.index}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`,
										}}
										className="px-4"
									>
										{isLoaderRow ? (
											<div className="flex justify-center items-center h-full">
												{hasNextPage ? (
													<div className="flex items-center">
														<div className="w-4 h-4 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin" />
														<span className="text-gray-500 ml-2">
															読み込み中
														</span>
													</div>
												) : (
													<span className="text-gray-400">
														これ以上項目はありません
													</span>
												)}
											</div>
										) : (
											<div className="py-4 px-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
												<div className="font-medium text-gray-800">{post}</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}

				{isFetching && !isFetchingNextPage && (
					<div className="mt-4 text-sm text-indigo-500 flex items-center">
						<div className="w-3 h-3 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin" />
						<span className="ml-2">バックグラウンドで更新中</span>
					</div>
				)}
			</div>
		</div>
	);
}

export function AppProvider() {
	return (
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	);
}
